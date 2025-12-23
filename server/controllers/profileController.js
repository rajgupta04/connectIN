const User = require('../models/User');
const Post = require('../models/Post');
const { validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const ProfileView = require('../models/ProfileView');

const PROFILE_VIEW_WINDOW_MS = 1000 * 60 * 60; // 1 hour

const recordProfileView = async (ownerId, viewerId) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - PROFILE_VIEW_WINDOW_MS);

    const recentView = await ProfileView.findOne({
        owner: ownerId,
        viewer: viewerId,
        viewedAt: { $gte: windowStart }
    });

    if (recentView) {
        // Refresh TTL without incrementing count
        await ProfileView.updateOne({ _id: recentView._id }, { $set: { viewedAt: now } });
        return false;
    }

    await Promise.all([
        ProfileView.findOneAndUpdate(
            { owner: ownerId, viewer: viewerId },
            { $set: { viewedAt: now } },
            { upsert: true }
        ),
        User.findByIdAndUpdate(ownerId, { $inc: { profileViewCount: 1 } })
    ]);

    return true;
};

exports.getProfileById = async (req, res) => {
    try {
        const user = await User.findById(req.params.user_id).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        const postCount = await Post.countDocuments({ user: req.params.user_id });

        // Convert to object to add postCount
        const profile = user.toObject();
        profile.postCount = postCount;
        profile.profileViewCount = profile.profileViewCount || 0;

        // Record profile views when someone else opens the profile
        if (req.user?.id && req.user.id !== req.params.user_id) {
            const didIncrement = await recordProfileView(req.params.user_id, req.user.id);

            if (didIncrement) {
                await Notification.create({
                    user: req.params.user_id,
                    type: 'profile_view',
                    fromUser: req.user.id
                });
            }
        }

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
            return res.status(400).json({ msg: 'Profile not found' });
        }
        res.status(500).send('Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        headline,
        location,
        company,
        about,
        skills
    } = req.body;

    const profileFields = {};
    if (headline) profileFields.headline = headline;
    if (location) profileFields.location = location;
    if (company) profileFields.company = company;
    if (about) profileFields.about = about;
    if (req.file) {
        // Handle avatar/cover uploads based on field name
        if (req.file.fieldname === 'cover') {
            profileFields.coverUrl = req.file.path;
        } else {
            profileFields.avatarUrl = req.file.path;
        }
    }
    if (skills) {
        profileFields.skills = skills.split(',').map(skill => skill.trim());
    }

    try {
        let user = await User.findById(req.user.id);

        if (user) {
            // Update
            user = await User.findByIdAndUpdate(
                req.user.id,
                { $set: profileFields },
                { new: true }
            );
            return res.json(user);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.addExperience = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    } = req.body;

    const newExp = {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    };

    try {
        const user = await User.findById(req.user.id);

        user.experience.unshift(newExp);

        await user.save();

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteExperience = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // Get remove index
        const removeIndex = user.experience
            .map(item => item.id)
            .indexOf(req.params.exp_id);

        if (removeIndex === -1) {
            return res.status(404).json({ msg: 'Experience credential not found' });
        }

        user.experience.splice(removeIndex, 1);

        await user.save();

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.addEducation = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldOfStudy,
      from,
      to,
      current,
      description
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldOfStudy,
      from,
      to,
      current,
      description
    };

    try {
      const user = await User.findById(req.user.id);

      user.education.unshift(newEdu);

      await user.save();

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
};

exports.deleteEducation = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Get remove index
    const removeIndex = user.education
      .map(item => item.id)
      .indexOf(req.params.edu_id);

    if (removeIndex === -1) {
        return res.status(404).json({ msg: 'Education credential not found' });
    }

    user.education.splice(removeIndex, 1);

    await user.save();

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
