import Notification from '../models/Notification.js';
import SensorData from '../models/SensorData.js';
import MandiPrice from '../models/MandiPrice.js';
import Agent from '../models/Agent.js';
import User from '../models/User.js';

// Create notification helper
export const createNotification = async (userId, type, category, title, message, actionType = 'none', actionData = null) => {
  try {
    const notification = new Notification({
      userId,
      type,
      category,
      title,
      message,
      priority: type === 'critical' ? 3 : type === 'alert' ? 2 : type === 'warning' ? 1 : 0,
      actionType,
      actionData
    });
    
    await notification.save();
    
    // Emit socket event for real-time notification
    const io = global.io;
    if (io) {
      io.to(userId.toString()).emit('notification', {
        id: notification._id,
        type,
        category,
        title,
        message,
        actionType
      });
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Smart notification generator
export const generateSmartNotifications = async () => {
  try {
    const farmers = await User.find({ role: 'farmer' });
    
    for (const farmer of farmers) {
      // 1. Sensor-based notifications
      const latestSensor = await SensorData.findOne({ farmerId: farmer._id })
        .sort({ timestamp: -1 });
      
      if (latestSensor) {
        // Temperature alerts
        if (latestSensor.temperature > 35) {
          await createNotification(
            farmer._id,
            'alert',
            'sensor',
            'High Temperature Alert',
            `Temperature is ${latestSensor.temperature}°C! Irrigation recommended. Find workers for irrigation →`,
            'find_labour',
            { service: 'irrigation' }
          );
        } else if (latestSensor.temperature < 15) {
          await createNotification(
            farmer._id,
            'warning',
            'sensor',
            'Low Temperature Warning',
            'Low temperature detected. Protect crops from frost.',
            'view_details'
          );
        }
        
        // Humidity alerts
        if (latestSensor.humidity > 85) {
          await createNotification(
            farmer._id,
            'alert',
            'disease',
            'High Humidity - Disease Risk',
            `High humidity ${latestSensor.humidity}%! Disease risk. Book spraying service now →`,
            'find_labour',
            { service: 'spraying' }
          );
        }
        
        // Soil moisture alerts
        if (latestSensor.soilMoisture < 30) {
          const nearbyAgents = await Agent.find({})
            .populate('userId')
            .limit(5);
          
          await createNotification(
            farmer._id,
            'critical',
            'sensor',
            'Critical: Low Soil Moisture',
            `Soil moisture ${latestSensor.soilMoisture}%! Immediate irrigation needed. ${nearbyAgents.length} workers available nearby →`,
            'find_labour',
            { service: 'irrigation', urgent: true }
          );
        }
      }
      
      // 2. Market price notifications
      const prices = await MandiPrice.find({ crop: 'Rice' })
        .sort({ date: -1 })
        .limit(2);
      
      if (prices.length >= 2) {
        const priceChange = ((prices[0].price - prices[1].price) / prices[1].price) * 100;
        
        if (priceChange > 10) {
          await createNotification(
            farmer._id,
            'success',
            'price',
            'Great Price Alert!',
            `🎉 Rice price up ${priceChange.toFixed(1)}%! ₹${prices[0].price} in nearby mandi - Best time to sell!`,
            'check_price',
            { crop: 'Rice' }
          );
        }
      }
      
      // 3. Labour availability notifications
      const newAgents = await Agent.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      if (newAgents.length > 0) {
        await createNotification(
          farmer._id,
          'info',
          'labour',
          'New Workers Available',
          `${newAgents.length} new workers registered nearby! Check profiles →`,
          'find_labour'
        );
      }
      
      // 4. Low-cost worker alerts
      const lowCostAgents = await Agent.find({ hourlyRate: { $lt: 150 } })
        .populate('userId')
        .sort({ hourlyRate: 1 })
        .limit(1);
      
      if (lowCostAgents.length > 0) {
        const agent = lowCostAgents[0];
        await createNotification(
          farmer._id,
          'success',
          'labour',
          'Low-Cost Worker Available',
          `💵 ${agent.userId.name} - ₹${agent.hourlyRate}/hr (${agent.rating.toFixed(1)}★ rated) →`,
          'find_labour',
          { agentId: agent._id }
        );
      }
      
      // 5. Top-rated worker alerts
      const topRatedAgents = await Agent.find({ rating: { $gte: 4.8 } })
        .populate('userId')
        .sort({ rating: -1 })
        .limit(1);
      
      if (topRatedAgents.length > 0) {
        const agent = topRatedAgents[0];
        await createNotification(
          farmer._id,
          'info',
          'labour',
          'Top-Rated Worker Nearby',
          `⭐ ${agent.userId.name} - ${agent.rating.toFixed(1)}★ rating, ${agent.completedJobs} jobs completed →`,
          'find_labour',
          { agentId: agent._id }
        );
      }
    }
    
    console.log('✅ Smart notifications generated');
  } catch (error) {
    console.error('Error generating notifications:', error);
  }
};

// Start notification scheduler
export const startNotificationScheduler = () => {
  // Run every 5 minutes
  setInterval(generateSmartNotifications, 5 * 60 * 1000);
  console.log('📢 Notification scheduler started');
};
