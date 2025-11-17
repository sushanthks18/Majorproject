import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Agent from './models/Agent.js';
import SensorData from './models/SensorData.js';
import MandiPrice from './models/MandiPrice.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Agent.deleteMany({});
    await SensorData.deleteMany({});
    await MandiPrice.deleteMany({});
    console.log('Cleared existing data');

    // Create test farmers
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const farmer1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'farmer1@test.com',
      password: hashedPassword,
      role: 'farmer',
      phone: '9876543210',
      location: {
        lat: 12.9716,
        lng: 77.5946,
        address: 'Bangalore, Karnataka'
      },
      farmSize: 5
    });

    const farmer2 = await User.create({
      name: 'Suresh Patil',
      email: 'farmer2@test.com',
      password: hashedPassword,
      role: 'farmer',
      phone: '9876543211',
      location: {
        lat: 13.0827,
        lng: 80.2707,
        address: 'Chennai, Tamil Nadu'
      },
      farmSize: 10
    });

    console.log('Created test farmers');

    // Create test agents
    const agent1User = await User.create({
      name: 'Ramesh Singh',
      email: 'agent1@test.com',
      password: hashedPassword,
      role: 'agent',
      phone: '9876543220',
      location: {
        lat: 12.9816,
        lng: 77.6046,
        address: 'Near Bangalore'
      }
    });

    const agent1 = await Agent.create({
      userId: agent1User._id,
      services: ['plowing', 'sowing', 'harvesting'],
      experience: 10,
      hourlyRate: 500,
      rating: 4.5,
      totalRatings: 25,
      availability: 'available',
      laborCount: 5,
      equipment: ['Tractor', 'Harvester'],
      completedJobs: 150
    });

    const agent2User = await User.create({
      name: 'Mohan Reddy',
      email: 'agent2@test.com',
      password: hashedPassword,
      role: 'agent',
      phone: '9876543221',
      location: {
        lat: 12.9516,
        lng: 77.5846,
        address: 'Bangalore Rural'
      }
    });

    const agent2 = await Agent.create({
      userId: agent2User._id,
      services: ['spraying', 'irrigation', 'weeding'],
      experience: 7,
      hourlyRate: 400,
      rating: 4.2,
      totalRatings: 18,
      availability: 'available',
      laborCount: 3,
      equipment: ['Sprayer', 'Water Pump'],
      completedJobs: 95
    });

    const agent3User = await User.create({
      name: 'Prakash Yadav',
      email: 'agent3@test.com',
      password: hashedPassword,
      role: 'agent',
      phone: '9876543222',
      location: {
        lat: 13.0916,
        lng: 80.2806,
        address: 'Chennai Suburbs'
      }
    });

    const agent3 = await Agent.create({
      userId: agent3User._id,
      services: ['plowing', 'spraying', 'fertilizing'],
      experience: 12,
      hourlyRate: 550,
      rating: 4.8,
      totalRatings: 40,
      availability: 'available',
      laborCount: 8,
      equipment: ['Tractor', 'Sprayer', 'Seed Drill'],
      completedJobs: 220
    });

    console.log('Created test agents');

    // Create sensor data
    const sensorReadings = [];
    const now = new Date();
    
    for (let i = 0; i < 48; i++) {
      const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000); // Every 30 minutes
      
      sensorReadings.push({
        farmerId: farmer1._id,
        temperature: 25 + Math.random() * 10,
        humidity: 60 + Math.random() * 20,
        soilMoisture: 40 + Math.random() * 30,
        pH: 6.0 + Math.random() * 1.5,
        timestamp
      });
    }

    await SensorData.insertMany(sensorReadings);
    console.log('Created sensor data');

    // Create mandi price data
    const crops = ['Rice', 'Wheat', 'Cotton', 'Maize', 'Sugarcane'];
    const locations = ['Bangalore APMC', 'Yeshwantpur Mandi', 'KR Market', 'Chennai Koyambedu'];
    const mandiPrices = [];

    crops.forEach(crop => {
      locations.forEach(location => {
        const basePrice = {
          'Rice': 2500,
          'Wheat': 2200,
          'Cotton': 6000,
          'Maize': 1800,
          'Sugarcane': 300
        }[crop];

        // Generate 30 days of price data
        for (let i = 30; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
          const trend = Math.sin(i / 10) * 0.1; // Seasonal trend
          const price = Math.round(basePrice * (1 + variation + trend));

          mandiPrices.push({
            crop,
            location,
            price,
            minPrice: Math.round(price * 0.9),
            maxPrice: Math.round(price * 1.1),
            date
          });
        }
      });
    });

    await MandiPrice.insertMany(mandiPrices);
    console.log('Created mandi price data');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('\nFarmer Accounts:');
    console.log('Email: farmer1@test.com | Password: password123');
    console.log('Email: farmer2@test.com | Password: password123');
    console.log('\nAgent Accounts:');
    console.log('Email: agent1@test.com | Password: password123');
    console.log('Email: agent2@test.com | Password: password123');
    console.log('Email: agent3@test.com | Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
