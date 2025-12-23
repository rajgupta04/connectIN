const User = require('../models/User');
const mongoose = require('mongoose');

exports.getAlumni = async (req, res) => {
    try {
        const { search } = req.query;
        const matchStage = {};

        if (search) {
            matchStage.name = { $regex: search, $options: 'i' };
        }

        const alumni = await User.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'posts',
                    let: { uid: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$user', '$$uid'] } } },
                        { $project: { _id: 1, impressionCount: { $ifNull: ['$impressionCount', 0] } } }
                    ],
                    as: 'userPosts'
                }
            },
            {
                $lookup: {
                    from: 'mentorshiprequests',
                    let: { menteeId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$mentee', '$$menteeId'] },
                                        { $eq: ['$status', 'accepted'] }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'mentor',
                                foreignField: '_id',
                                as: 'mentorUser'
                            }
                        },
                        { $unwind: { path: '$mentorUser', preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: 0,
                                mentor: {
                                    _id: '$mentorUser._id',
                                    name: '$mentorUser.name',
                                    avatarUrl: '$mentorUser.avatarUrl'
                                }
                            }
                        }
                    ],
                    as: 'mentorInfo'
                }
            },
            {
                $addFields: {
                    postImpressionCount: { $sum: '$userPosts.impressionCount' },
                    postCount: { $size: '$userPosts' },
                    mentor: { $arrayElemAt: ['$mentorInfo.mentor', 0] },
                    profileViewCount: { $ifNull: ['$profileViewCount', 0] }
                }
            },
            {
                $project: {
                    password: 0,
                    userPosts: 0,
                    mentorInfo: 0
                }
            }
        ]);

        res.json(alumni);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
