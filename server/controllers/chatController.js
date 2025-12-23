const Message = require('../models/Message');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const { getIO, getUserSocket } = require('../socket');

exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        const senderId = req.user.id;

        const newMessage = new Message({
            sender: senderId,
            recipient: recipientId,
            content
        });

        await newMessage.save();

        // Create Notification
        const notification = new Notification({
            user: recipientId,
            type: 'message',
            fromUser: senderId,
            read: false
        });
        await notification.save();

        // Real-time update
        const io = getIO();
        const recipientSocketId = getUserSocket(recipientId);
        
        if (recipientSocketId) {
            // Emit message event for chat window
            io.to(recipientSocketId).emit('receive_message', {
                message: newMessage,
                from: senderId
            });

            // Emit notification event for top bar
            io.to(recipientSocketId).emit('notification', {
                type: 'message',
                fromUser: {
                    _id: req.user.id,
                    name: req.user.name, // Assuming user is in req.user from auth middleware
                    avatarUrl: req.user.avatarUrl
                },
                message: content
            });
        }

        res.json(newMessage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: userId },
                { sender: userId, recipient: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getConversations = async (req, res) => {
    try {
        // Get all accepted connections for the user
        const connections = await Connection.find({
            $or: [
                { requester: req.user.id, status: 'accepted' },
                { recipient: req.user.id, status: 'accepted' }
            ]
        }).populate('requester', 'name avatarUrl headline')
          .populate('recipient', 'name avatarUrl headline');

        const conversations = connections.map(conn => {
            if (conn.requester._id.toString() === req.user.id) {
                return conn.recipient;
            } else {
                return conn.requester;
            }
        });

        res.json(conversations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
