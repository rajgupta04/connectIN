const mongoose = require('mongoose');

const ProfileViewSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now, expires: 60 * 60 } // TTL in seconds (1 hour)
});

ProfileViewSchema.index({ owner: 1, viewer: 1 });

module.exports = mongoose.model('ProfileView', ProfileViewSchema);
