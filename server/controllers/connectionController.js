const Connection = require('../models/Connection');
const User = require('../models/User');
const Notification = require('../models/Notification');

const { getIO, getUserSocket } = require('../socket');

exports.sendConnectionRequest = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
        return res.status(400).json({ msg: 'Cannot connect with yourself' });
    }

    const recipient = await User.findById(req.params.id);
    if (!recipient) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.id },
        { requester: req.params.id, recipient: req.user.id }
      ]
    });

    if (existingConnection) {
      return res.status(400).json({ msg: 'Connection request already sent or exists' });
    }

    const { message } = req.body; // Get message from body

    const newConnection = new Connection({
      requester: req.user.id,
      recipient: req.params.id,
      status: 'pending',
      message: message || ''
    });

    await newConnection.save();

    // Create Notification
    const notification = new Notification({
        user: req.params.id,
        type: 'connection_request',
        fromUser: req.user.id,
        read: false
    });
    await notification.save();

    // Real-time Notification
    const io = getIO();
    const recipientSocketId = getUserSocket(req.params.id);
    if (recipientSocketId) {
        io.to(recipientSocketId).emit('notification', {
            type: 'connection_request',
            fromUser: {
                _id: req.user.id,
                name: req.user.name, // Assuming user is in req.user from auth middleware
                avatarUrl: req.user.avatarUrl
            },
            message: message
        });
    }

    res.json(newConnection);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.acceptConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({ msg: 'Connection request not found' });
    }

    // Check if user is the recipient
    if (connection.recipient.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    connection.status = 'accepted';
    await connection.save();

    // Add to users' connections list
    await User.findByIdAndUpdate(connection.requester, {
        $push: { connections: connection.recipient }
    });
    await User.findByIdAndUpdate(connection.recipient, {
        $push: { connections: connection.requester }
    });

    // Create Notification for requester
    const newNotification = new Notification({
        user: connection.requester,
        type: 'connection_accepted',
        fromUser: req.user.id
    });
    await newNotification.save();

    // Real-time Notification
    const io = getIO();
    const requesterSocketId = getUserSocket(connection.requester.toString());
    if (requesterSocketId) {
        io.to(requesterSocketId).emit('notification', {
            type: 'connection_accepted',
            fromUser: {
                _id: req.user.id,
                name: req.user.name
            }
        });
    }

    res.json(connection);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getConnectionRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      recipient: req.user.id,
      status: 'pending'
    }).populate('requester', ['name', 'avatarUrl', 'headline']);

    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getConnections = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('connections', ['name', 'avatarUrl', 'headline', 'location']);
        res.json(user.connections);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
