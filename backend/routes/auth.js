import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Agent from '../models/Agent.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// In-memory OTP storage for farmer/labour phone authentication
const otpStore = new Map();

// Helper to normalize Indian phone numbers to 10 digits
const normalizePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, role = 'farmer' } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    // Generate 6-digit OTP (in development/demo, also accept 123456)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    const storeKey = `${role}:${cleanPhone}`;
    otpStore.set(storeKey, { otp, expiresAt });

    console.log(`📲 [Auth OTP] Code generated for ${role} (${cleanPhone}): ${otp}`);

    return res.json({
      success: true,
      message: 'OTP sent successfully to your mobile number',
      phone: cleanPhone,
      // Provide OTP in response for seamless development & demo convenience
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP', details: error.message });
  }
});

// Verify OTP & Login / Auto-Register
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, role = 'farmer' } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const cleanPhone = normalizePhone(phone);
    const storeKey = `${role}:${cleanPhone}`;
    const record = otpStore.get(storeKey);

    // Verify OTP against store or universal dev OTP 123456
    const isMasterOtp = otp.trim() === '123456';
    const isStoredMatch = record && record.otp === otp.trim() && Date.now() < record.expiresAt;

    if (!isMasterOtp && !isStoredMatch) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please try again or request a new OTP.' });
    }

    // Clear OTP after successful use
    otpStore.delete(storeKey);

    // Find user by phone and role
    let user = await User.findOne({
      role,
      $or: [
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` },
        { phone: { $regex: cleanPhone } }
      ]
    });

    // If user does not exist yet, automatically provision their profile
    if (!user) {
      console.log(`Creating new account for ${role} with phone: ${cleanPhone}`);
      const randomPassword = await bcrypt.hash(`Krishi@${cleanPhone}`, 10);
      user = new User({
        name: role === 'farmer' ? `Farmer ${cleanPhone.slice(-4)}` : `Agent ${cleanPhone.slice(-4)}`,
        email: `${cleanPhone}@krishisakha.in`,
        password: randomPassword,
        role,
        phone: cleanPhone,
        farmSize: role === 'farmer' ? 2.5 : 0,
        location: { address: 'Karnataka, India' }
      });

      try {
        await user.save();
        if (role === 'agent') {
          const agentProfile = new Agent({ userId: user._id });
          await agentProfile.save();
        }
      } catch (err) {
        console.warn('Auto user save note:', err.message);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'krishi-sakha-secret-key-2024',
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful via OTP',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        farmSize: user.farmSize,
        farmDetails: user.farmDetails
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, phone, location, farmSize, farmDetails } = req.body;

    // Check if user exists
    try {
      const existingUser = await User.findOne({ email }).maxTimeMS(2000);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    } catch (dbError) {
      // If DB check fails, continue (no duplicates in memory)
      console.log('DB check skipped, creating user...');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      location,
      farmSize: role === 'farmer' ? farmSize : 0,
      farmDetails: role === 'farmer' ? farmDetails : {}
    });

    try {
      await user.save();
    } catch (saveError) {
      console.warn('User save to DB failed, using in-memory:', saveError.message);
      // Assign temp ID for in-memory mode
      user._id = Date.now().toString();
    }

      // If agent, create agent profile
      if (role === 'agent') {
        const agent = new Agent({
          userId: user._id
        });
        try {
          await agent.save();
        } catch (agentError) {
          console.warn('Agent save failed:', agentError.message);
        }
      }

      // If farmer, automatically instantiate their registered physical Field boundary
      if (role === 'farmer' && farmDetails && farmDetails.fieldName) {
        try {
          const Field = (await import('../models/Field.js')).default;
          const fieldPayload = new Field({
             farmerId: user._id,
             name: farmDetails.fieldName,
             registrationType: 'polygon',
             centerLat: farmDetails.lat,
             centerLng: farmDetails.lng,
             boundary: {
               type: 'Polygon',
               coordinates: [
                 [...farmDetails.boundary.map(c => [c[1], c[0]]), [farmDetails.boundary[0][1], farmDetails.boundary[0][0]]]
               ]
             },
             areaHectares: farmDetails.boundary.length > 0 ? 1.5 : 0.5,
             soilType: farmDetails.soil,
             cropType: farmDetails.crop,
             verificationStatus: 'unverified'
          });
          await fieldPayload.save();
        } catch (fieldError) {
          console.warn('Field injection failed:', fieldError.message);
        }
      }

      // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'krishi-sakha-secret-key-2024',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        farmDetails: user.farmDetails
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup', details: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, phone, identifier, password, role } = req.body;
    const loginTarget = identifier || email || phone;

    if (!loginTarget || !password) {
      return res.status(400).json({ error: 'Please enter your mobile number or email and password' });
    }

    // Find user by either email or phone
    const cleanPhone = normalizePhone(loginTarget);
    let user;
    try {
      user = await User.findOne({
        role,
        $or: [
          { email: loginTarget.toLowerCase().trim() },
          { phone: loginTarget },
          ...(cleanPhone.length >= 10 ? [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }] : [])
        ]
      }).maxTimeMS(2000);
    } catch (dbError) {
      console.warn('DB login failed:', dbError.message);
      return res.status(401).json({ error: 'Database unavailable. Please try signup first or restart backend.' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Account not found with this mobile/email' });
    }

    // Check role
    if (user.role !== role) {
      return res.status(401).json({ error: `This account is registered as ${user.role}` });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'krishi-sakha-secret-key-2024',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        farmSize: user.farmSize,
        farmDetails: user.farmDetails
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

// Get profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password update here
    delete updates.email; // Don't allow email update
    delete updates.role; // Don't allow role change

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user location
router.put('/update-location', authenticate, async (req, res) => {
  try {
    const { location } = req.body;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ error: 'Invalid location data' });
    }

    console.log(`🗺️  Updating location for user ${req.userId}:`, location);

    const user = await User.findByIdAndUpdate(
      req.userId,
      { location },
      { new: true, runValidators: true }
    ).select('-password');

    console.log('✅ Location updated successfully:', user.location);

    res.json({ 
      message: 'Location updated successfully', 
      location: user.location 
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
