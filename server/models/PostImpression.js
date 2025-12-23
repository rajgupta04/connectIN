const mongoose = require('mongoose');

const PostImpressionSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  impressedAt: { type: Date, default: Date.now, expires: 60 * 60 } // TTL in seconds (1 hour)
});

PostImpressionSchema.index({ post: 1, viewer: 1 });

module.exports = mongoose.model('PostImpression', PostImpressionSchema);
