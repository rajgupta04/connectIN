const User = require('../models/User');
const MentorshipRequest = require('../models/MentorshipRequest');

exports.getMentors = async (req, res) => {
    try {
        const { topic, school, search } = req.query;
        let query = { isMentor: true };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { headline: { $regex: search, $options: 'i' } },
                { mentorshipTopics: { $regex: search, $options: 'i' } }
            ];
        }

        if (topic) {
            query.mentorshipTopics = { $in: [new RegExp(topic, 'i')] };
        }

        if (school) {
            query['education.school'] = { $regex: school, $options: 'i' };
        }

        // Exclude current user
        query._id = { $ne: req.user.id };

        const mentors = await User.find(query).select('-password');
        res.json(mentors);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updatePreferences = async (req, res) => {
    const { isMentor, isMentee, mentorshipTopics, availability } = req.body;
    const mentorshipFields = { isMentor, isMentee, mentorshipTopics, availability };

    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: mentorshipFields },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.sendRequest = async (req, res) => {
    try {
        const mentor = await User.findById(req.params.mentorId);
        if (!mentor) return res.status(404).json({ msg: 'Mentor not found' });

        // Check if request already exists
        const existingRequest = await MentorshipRequest.findOne({
            mentor: req.params.mentorId,
            mentee: req.user.id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ msg: 'Request already pending' });
        }

        const newRequest = new MentorshipRequest({
            mentor: req.params.mentorId,
            mentee: req.user.id,
            message: req.body.message
        });

        const request = await newRequest.save();
        res.json(request);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getRequests = async (req, res) => {
    try {
        const requests = await MentorshipRequest.find({
            $or: [{ mentor: req.user.id }, { mentee: req.user.id }]
        })
        .populate('mentor', 'name avatarUrl headline')
        .populate('mentee', 'name avatarUrl headline')
        .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let request = await MentorshipRequest.findById(req.params.requestId);

        if (!request) return res.status(404).json({ msg: 'Request not found' });

        // Ensure only the mentor can update status
        if (request.mentor.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        request.status = status;
        await request.save();

        res.json(request);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
