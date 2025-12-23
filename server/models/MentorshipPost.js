const mongoose = require('mongoose');

const MentorshipPostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    datePosted: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MentorshipPost', MentorshipPostSchema);
