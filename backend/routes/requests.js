import express from 'express';
import Request from '../models/Request.js';
import Agent from '../models/Agent.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticate, authenticateFarmer, authenticateAgent } from '../middleware/auth.js';

const router = express.Router();

// Create labour request (Farmer only)
router.post('/create', authenticateFarmer, async (req, res) => {
  try {
    const { agentId, service, preferredDate, notes, farmLocation } = req.body;

    // Verify agent exists
    const agentUser = await User.findById(agentId);
    if (!agentUser || agentUser.role !== 'agent') {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get agent profile for cost estimation
    const agentProfile = await Agent.findOne({ userId: agentId });
    const estimatedCost = agentProfile ? agentProfile.hourlyRate * 8 : 0;

    const request = new Request({
      farmerId: req.userId,
      agentId,
      service,
      preferredDate: new Date(preferredDate),
      notes,
      farmLocation: farmLocation || req.user.location,
      estimatedCost,
      status: 'pending'
    });

    await request.save();

    // Populate farmer and agent details
    await request.populate(['farmerId', 'agentId']);

    // Send real-time notification to agent
    if (req.app.get('io')) {
      req.app.get('io').to(agentId.toString()).emit('newRequest', {
        requestId: request._id,
        farmerName: request.farmerId.name,
        farmerPhone: request.farmerId.phone,
        service: request.service,
        preferredDate: request.preferredDate,
        notes: request.notes
      });
    }

    res.status(201).json({
      message: 'Service request created successfully',
      request
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get farmer's all requests
router.get('/farmer/:farmerId', authenticate, async (req, res) => {
  try {
    const { farmerId } = req.params;

    // Ensure farmer can only see their own requests
    if (req.user.role === 'farmer' && req.userId.toString() !== farmerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const requests = await Request.find({ farmerId })
      .populate('agentId')
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(req => ({
      requestId: req._id,
      agentName: req.agentId.name,
      agentPhone: req.agentId.phone,
      agentEmail: req.agentId.email,
      service: req.service,
      preferredDate: req.preferredDate,
      status: req.status,
      notes: req.notes,
      estimatedCost: req.estimatedCost,
      actualCost: req.actualCost,
      createdAt: req.createdAt,
      completedAt: req.completedAt
    }));

    res.json({ requests: formattedRequests });
  } catch (error) {
    console.error('Error fetching farmer requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get requests for specific agent
router.get('/agent/:agentId', authenticate, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    // Ensure agent can only see their own requests
    if (req.user.role === 'agent' && req.userId.toString() !== agentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const query = { agentId };
    if (status) {
      query.status = status;
    }

    const requests = await Request.find(query)
      .populate('farmerId')
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(req => ({
      requestId: req._id,
      farmerName: req.farmerId.name,
      farmerPhone: req.farmerId.phone,
      farmerEmail: req.farmerId.email,
      farmerLocation: req.farmerId.location,
      service: req.service,
      preferredDate: req.preferredDate,
      status: req.status,
      farmLocation: req.farmLocation,
      notes: req.notes,
      estimatedCost: req.estimatedCost,
      actualCost: req.actualCost,
      createdAt: req.createdAt,
      completedAt: req.completedAt
    }));

    res.json({ requests: formattedRequests });
  } catch (error) {
    console.error('Error fetching agent requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update request status (Agent only)
router.put('/:id/status', authenticateAgent, async (req, res) => {
  try {
    const { status, actualCost } = req.body;
    const requestId = req.params.id;

    const request = await Request.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify agent owns this request
    if (request.agentId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    request.status = status;
    
    if (status === 'completed') {
      request.completedAt = new Date();
      if (actualCost) {
        request.actualCost = actualCost;
      }

      // Update agent stats
      const agent = await Agent.findOne({ userId: req.userId });
      if (agent) {
        agent.completedJobs += 1;
        agent.totalEarnings += actualCost || request.estimatedCost;
        await agent.save();
      }
    }
    
    // Save the request first
    await request.save();
    
    // Populate after saving
    await request.populate(['farmerId', 'agentId']);
    
    // Create notification for farmer when request is accepted
    if (status === 'accepted') {
      const notification = new Notification({
        userId: request.farmerId._id,
        type: 'success',
        category: 'labour',
        title: '✅ Service Request Accepted!',
        message: `${request.agentId.name} has accepted your request for ${request.service}. Scheduled for ${new Date(request.preferredDate).toLocaleDateString()}.`,
        actionType: 'view_details',
        actionData: {
          requestId: request._id,
          agentId: request.agentId._id
        }
      });
      
      await notification.save();
      
      console.log(`📢 Notification created for farmer ${request.farmerId._id}: Request accepted by ${request.agentId.name}`);
    }
    
    // Create notification for farmer when request is completed
    if (status === 'completed') {
      const notification = new Notification({
        userId: request.farmerId._id,
        type: 'info',
        category: 'labour',
        title: '✓ Service Completed',
        message: `${request.agentId.name} has completed the ${request.service} service. Cost: ₹${actualCost || request.estimatedCost}`,
        actionType: 'view_details',
        actionData: {
          requestId: request._id,
          cost: actualCost || request.estimatedCost
        }
      });
      
      await notification.save();
    }
    
    // Create notification for farmer when request is rejected
    if (status === 'rejected') {
      const notification = new Notification({
        userId: request.farmerId._id,
        type: 'warning',
        category: 'labour',
        title: '❌ Service Request Rejected',
        message: `${request.agentId.name} has declined your request for ${request.service}. Please try another agent.`,
        actionType: 'find_labour',
        actionData: {
          service: request.service
        }
      });
      
      await notification.save();
    }

    // Send real-time notification to farmer via Socket.io
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      // Emit to farmer's room
      io.to(request.farmerId._id.toString()).emit('requestUpdate', {
        requestId: request._id,
        status: request.status,
        agentName: request.agentId.name,
        agentPhone: request.agentId.phone,
        service: request.service,
        message: status === 'accepted' 
          ? `${request.agentId.name} accepted your request!` 
          : status === 'rejected'
          ? `${request.agentId.name} declined your request`
          : status === 'completed'
          ? `${request.agentId.name} completed the service`
          : 'Request status updated'
      });
      
      console.log(`🔔 Real-time notification sent to farmer ${request.farmerId._id}`);
    }

    res.json({
      message: `Request ${status}`,
      request
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all active requests
router.get('/active', authenticate, async (req, res) => {
  try {
    const query = { 
      status: { $in: ['pending', 'accepted'] }
    };

    // Filter by user role
    if (req.user.role === 'farmer') {
      query.farmerId = req.userId;
    } else if (req.user.role === 'agent') {
      query.agentId = req.userId;
    }

    const requests = await Request.find(query)
      .populate(['farmerId', 'agentId'])
      .sort({ createdAt: -1 });

    res.json({ 
      requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching active requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel request (Farmer only)
router.put('/:id/cancel', authenticateFarmer, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify farmer owns this request
    if (request.farmerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }

    request.status = 'cancelled';
    await request.save();

    // Notify agent
    if (req.app.get('io')) {
      req.app.get('io').to(request.agentId.toString()).emit('requestCancelled', {
        requestId: request._id
      });
    }

    res.json({
      message: 'Request cancelled',
      request
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
