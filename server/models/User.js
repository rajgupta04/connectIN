const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  headline: { type: String }, // e.g., "Software Engineer at Google"
  location: { type: String },
  company: { type: String },
  about: { type: String },
  skills: [{ type: String }],
  experience: [{
    title: { type: String },
    company: { type: String },
    location: { type: String },
    from: { type: Date },
    to: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String }
  }],
  education: [{
    school: { type: String },
    degree: { type: String },
    fieldOfStudy: { type: String },
    from: { type: Date },
    to: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String }
  }],
  avatarUrl: { type: String },
  coverUrl: { type: String },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of connected user IDs
  
  // Mentorship Fields
  isMentor: { type: Boolean, default: false },
  isMentee: { type: Boolean, default: false },
  mentorshipTopics: [{ type: String }],
  availability: { type: String }, // e.g. "Weekends", "Evenings"

  // Analytics
  profileViewCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
