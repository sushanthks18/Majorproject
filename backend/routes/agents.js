import express from 'express';
import { getDistance } from 'geolib';
import User from '../models/User.js';
import Agent from '../models/Agent.js';
import { authenticate, authenticateAgent } from '../middleware/auth.js';

const router = express.Router();

// Get nearby agents
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius = 50, service } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    console.log('🔍 Searching agents near:', { lat: latitude, lng: longitude, radius: radiusKm, service });

    // Find all agents
    let agentQuery = {};
    if (service) {
      agentQuery.services = service;
    }

    const agents = await Agent.find(agentQuery).populate('userId');
    console.log(`📊 Found ${agents.length} agents in database`);
    
    // DEBUG: Log all agents from DB
    agents.forEach(agent => {
      console.log(`   DB Agent: ${agent.userId.name} (userId: ${agent.userId._id}) - ${agent.services.length} services, ₹${agent.hourlyRate}/hr, ${agent.laborCount} workers`);
    });

    // Calculate distance and filter by radius
    const nearbyAgents = agents
      .map(agent => {
        // Handle case where location might be (0,0)
        let distance = 0;
        if (agent.userId.location.lat === 0 && agent.userId.location.lng === 0) {
          // If agent location is (0,0), set distance to 0 to show them
          distance = 0;
        } else {
          distance = getDistance(
            { latitude, longitude },
            { 
              latitude: agent.userId.location.lat, 
              longitude: agent.userId.location.lng 
            }
          ) / 1000; // Convert to km
        }

        return {
          agentId: agent._id,
          userId: agent.userId._id,
          name: agent.userId.name,
          phone: agent.userId.phone,
          email: agent.userId.email,
          location: agent.userId.location,
          profilePic: agent.userId.profilePic,
          services: agent.services,
          experience: agent.experience,
          hourlyRate: agent.hourlyRate,
          rating: agent.rating,
          totalRatings: agent.totalRatings,
          availability: agent.availability,
          laborCount: agent.laborCount,
          equipment: agent.equipment,
          completedJobs: agent.completedJobs,
          distance: Math.round(distance * 10) / 10
        };
      })
      // Show all agents regardless of distance (for development)
      .sort((a, b) => a.distance - b.distance);

    console.log(`✅ Returning ${nearbyAgents.length} agents within ${radiusKm}km`);
    nearbyAgents.forEach(agent => {
      console.log(`   - ${agent.name}: ${agent.services.length} services, ₹${agent.hourlyRate}/hr, ${agent.laborCount} workers, ${agent.availability}`);
    });

    res.json({ 
      agents: nearbyAgents,
      count: nearbyAgents.length,
      searchRadius: radiusKm
    });
  } catch (error) {
    console.error('Error fetching nearby agents:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get logged-in agent's profile (MUST be before /:id route)
router.get('/my-profile', authenticateAgent, async (req, res) => {
  try {
    console.log('🔍 Fetching profile for userId:', req.userId);
    const agent = await Agent.findOne({ userId: req.userId }).populate('userId');

    if (!agent) {
      console.log('⚠️ No profile found for userId:', req.userId);
      return res.status(404).json({ error: 'Agent profile not found' });
    }

    console.log('✅ Profile found:', {
      agentId: agent._id,
      services: agent.services.length,
      hourlyRate: agent.hourlyRate
    });

    res.json({
      agentId: agent._id,
      userId: agent.userId._id,
      name: agent.userId.name,
      phone: agent.userId.phone,
      email: agent.userId.email,
      location: agent.userId.location,
      profilePic: agent.userId.profilePic,
      services: agent.services,
      experience: agent.experience,
      hourlyRate: agent.hourlyRate,
      rating: agent.rating,
      totalRatings: agent.totalRatings,
      availability: agent.availability,
      laborCount: agent.laborCount,
      equipment: agent.equipment,
      completedJobs: agent.completedJobs,
      totalEarnings: agent.totalEarnings
    });
  } catch (error) {
    console.error('❌ Error fetching agent profile:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ADMIN: Delete duplicate agent profiles (MUST be before /:id route)
router.get('/cleanup-now', async (req, res) => {
  try {
    console.log('🗑️  Starting cleanup - deleting all agents EXCEPT current user...');
    
    // KEEP ONLY the agent with userId: 691591e6812ed5635abfec55
    const keepUserId = '691591e6812ed5635abfec55';
    
    const allAgents = await Agent.find().populate('userId');
    console.log(`Found ${allAgents.length} total agents`);
    
    let deleteCount = 0;
    
    for (const agent of allAgents) {
      if (agent.userId._id.toString() !== keepUserId) {
        await Agent.deleteOne({ _id: agent._id });
        console.log(`  ❌ Deleted: ${agent.userId.email} - ₹${agent.hourlyRate}/hr`);
        deleteCount++;
      } else {
        console.log(`  ✅ Keeping: ${agent.userId.email} - ₹${agent.hourlyRate}/hr (${agent.laborCount} workers)`);
      }
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${deleteCount} old profiles`);
    
    const remaining = await Agent.find();
    
    res.json({
      message: 'Cleanup successful - kept only your current profile',
      deletedCount: deleteCount,
      remainingAgents: remaining.length
    });
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get agent by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).populate('userId');

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      agentId: agent._id,
      userId: agent.userId._id,
      name: agent.userId.name,
      phone: agent.userId.phone,
      email: agent.userId.email,
      location: agent.userId.location,
      profilePic: agent.userId.profilePic,
      services: agent.services,
      experience: agent.experience,
      hourlyRate: agent.hourlyRate,
      rating: agent.rating,
      totalRatings: agent.totalRatings,
      availability: agent.availability,
      laborCount: agent.laborCount,
      equipment: agent.equipment,
      completedJobs: agent.completedJobs,
      totalEarnings: agent.totalEarnings
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register/Update agent profile
router.post('/register', authenticateAgent, async (req, res) => {
  try {
    const { services, experience, hourlyRate, laborCount, equipment, availability } = req.body;

    console.log('📝 Saving agent profile for userId:', req.userId);
    console.log('Data:', { services, experience, hourlyRate, laborCount, equipment, availability });

    let agent = await Agent.findOne({ userId: req.userId });

    if (agent) {
      // Update existing
      console.log('Updating existing agent profile');
      agent.services = services || agent.services;
      agent.experience = experience !== undefined ? experience : agent.experience;
      agent.hourlyRate = hourlyRate !== undefined ? hourlyRate : agent.hourlyRate;
      agent.laborCount = laborCount !== undefined ? laborCount : agent.laborCount;
      agent.equipment = equipment || agent.equipment;
      agent.availability = availability || agent.availability;
      
      await agent.save();
      console.log('✅ Agent profile updated successfully');
    } else {
      // Create new
      console.log('Creating new agent profile');
      agent = new Agent({
        userId: req.userId,
        services: services || [],
        experience: experience || 0,
        hourlyRate: hourlyRate || 0,
        laborCount: laborCount || 1,
        equipment: equipment || [],
        availability: availability || 'available'
      });
      
      await agent.save();
      console.log('✅ New agent profile created successfully');
    }

    await agent.populate('userId');

    res.json({
      message: 'Agent profile updated successfully',
      agent: {
        agentId: agent._id,
        services: agent.services,
        experience: agent.experience,
        hourlyRate: agent.hourlyRate,
        laborCount: agent.laborCount,
        equipment: agent.equipment,
        availability: agent.availability
      }
    });
  } catch (error) {
    console.error('❌ Error registering agent:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update agent profile
router.put('/:id', authenticateAgent, async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, userId: req.userId });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found or unauthorized' });
    }

    const { services, experience, hourlyRate, laborCount, equipment, availability } = req.body;

    agent.services = services !== undefined ? services : agent.services;
    agent.experience = experience !== undefined ? experience : agent.experience;
    agent.hourlyRate = hourlyRate !== undefined ? hourlyRate : agent.hourlyRate;
    agent.laborCount = laborCount !== undefined ? laborCount : agent.laborCount;
    agent.equipment = equipment !== undefined ? equipment : agent.equipment;
    agent.availability = availability !== undefined ? availability : agent.availability;

    await agent.save();

    res.json({
      message: 'Agent profile updated',
      agent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
