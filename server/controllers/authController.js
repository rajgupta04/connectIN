const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const MentorshipRequest = require('../models/MentorshipRequest');
const Post = require('../models/Post');
const { OAuth2Client } = require('google-auth-library');

const getGoogleClientId = () => {
    return process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
};

const signToken = (userId) => {
    const payload = { user: { id: userId } };
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => (err ? reject(err) : resolve(token))
        );
    });
};

const shouldUpdateAvatarFromGoogle = (currentAvatarUrl, googlePictureUrl) => {
    if (!googlePictureUrl) return false;
    if (!currentAvatarUrl) return true;

    const current = String(currentAvatarUrl);
    // If the current avatar is already a Google-hosted image, keep it in sync.
    if (current.includes('googleusercontent.com') || current.includes('lh3.googleusercontent.com')) {
        return current !== googlePictureUrl;
    }

    // Otherwise, assume it may be a user-uploaded/custom avatar; don't overwrite.
    return false;
};

exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
        }

        user = new User({
            name,
            email,
            password
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const clientId = getGoogleClientId();
        if (!clientId) {
            return res.status(500).json({ msg: 'Google OAuth is not configured (missing GOOGLE_CLIENT_ID).' });
        }

        const credential = req.body?.credential;
        if (!credential) {
            return res.status(400).json({ msg: 'Missing Google credential' });
        }

        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: clientId
        });

        const payload = ticket.getPayload();
        const email = payload?.email;
        const name = payload?.name;
        const picture = payload?.picture;

        if (!email) {
            return res.status(400).json({ msg: 'Google token did not include email' });
        }

        let user = await User.findOne({ email });

        if (!user) {
            const randomPassword = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(randomPassword, salt);

            user = new User({
                name: name || email.split('@')[0],
                email,
                password: hashed,
                avatarUrl: picture
            });

            await user.save();
        } else {
            // Keep profile fresh (non-destructive)
            const update = {};
            if (!user.name && name) update.name = name;
            if (shouldUpdateAvatarFromGoogle(user.avatarUrl, picture)) update.avatarUrl = picture;
            if (Object.keys(update).length) {
                await User.updateOne({ _id: user._id }, { $set: update });
            }
        }

        // Re-fetch so response includes any updates we just applied.
        const hydratedUser = await User.findById(user.id).select('-password');
        const token = await signToken(user.id);
        return res.json({ token, user: hydratedUser });
    } catch (err) {
        console.error(err);
        return res.status(401).json({ msg: 'Google authentication failed' });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const [mentorRequest, postAgg] = await Promise.all([
            MentorshipRequest.findOne({ mentee: req.user.id, status: 'accepted' })
                .sort({ createdAt: -1 })
                .populate('mentor', 'name avatarUrl'),
            Post.aggregate([
                { $match: { user: user._id } },
                { $group: { _id: '$user', postImpressionCount: { $sum: { $ifNull: ['$impressionCount', 0] } } } }
            ])
        ]);

        const enriched = user.toObject();
        enriched.profileViewCount = enriched.profileViewCount || 0;
        enriched.postImpressionCount = postAgg?.[0]?.postImpressionCount || 0;
        enriched.mentor = mentorRequest?.mentor
            ? {
                _id: mentorRequest.mentor._id,
                name: mentorRequest.mentor.name,
                avatarUrl: mentorRequest.mentor.avatarUrl
            }
            : null;

        res.json(enriched);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
