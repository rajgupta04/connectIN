const Discussion = require('../models/Discussion');

exports.getDiscussions = async (req, res) => {
    try {
        const discussions = await Discussion.find().populate('author', 'name avatarUrl');
        res.json(discussions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
