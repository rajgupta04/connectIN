const mongoose = require('mongoose');

const DiscussionSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Discussion', DiscussionSchema);
