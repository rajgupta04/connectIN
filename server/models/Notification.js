const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Recipient
  type: { 
    type: String, 
    enum: ['like', 'comment', 'connection_request', 'connection_accepted', 'message', 'profile_view'], 
    required: true 
  },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Sender
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // Related post (if applicable)
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
