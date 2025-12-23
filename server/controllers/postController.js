const { validationResult } = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PostImpression = require('../models/PostImpression');
const { detectMediaType } = require('../lib/media');
const { getIO, getUserSocket } = require('../socket');

const POST_IMPRESSION_WINDOW_MS = 1000 * 60 * 60; // 1 hour

const stripImpressionCountForNonOwner = (postDoc, viewerId) => {
    if (!postDoc) return postDoc;

    const obj = typeof postDoc.toObject === 'function' ? postDoc.toObject() : postDoc;
    const ownerId = obj.user && (obj.user._id ? obj.user._id.toString() : obj.user.toString());
    const viewer = viewerId?.toString?.() || viewerId;

    if (ownerId && viewer && ownerId === viewer) {
        return obj;
    }

    if (obj && Object.prototype.hasOwnProperty.call(obj, 'impressionCount')) {
        delete obj.impressionCount;
    }
    return obj;
};

// Helper to generate deep populate object
const getDeepPopulate = (depth = 5) => {
    if (depth === 0) return null;
    return {
        path: 'replies',
        populate: [
            { path: 'user', select: 'name avatarUrl' },
            getDeepPopulate(depth - 1)
        ].filter(Boolean)
    };
};

exports.createPost = async (req, res) => {
    // Manual validation for content since express-validator doesn't play nice with multer sometimes
    if (!req.body.content) {
        return res.status(400).json({ errors: [{ msg: 'Content is required' }] });
    }

    try {
        const user = await User.findById(req.user.id).select('-password');

        const file =
            (req.files && (req.files.media?.[0] || req.files.image?.[0])) ||
            req.file ||
            null;

        const mediaType = detectMediaType(file) || 'image';
        const mediaUrl = file?.path;

        if (file && !mediaUrl) {
            console.error('Upload succeeded but file.path missing:', { file });
        }

        const newPost = new Post({
            content: req.body.content,
            // legacy
            image: mediaUrl,
            // new
            mediaUrl,
            mediaType: file ? mediaType : undefined,
            user: req.user.id
        });

        const post = await newPost.save();
        // Populate user details for immediate display
        await post.populate('user', ['name', 'avatarUrl', 'headline', 'education']);

        res.json(post);
    } catch (err) {
        console.error('Create post failed:', {
            message: err.message,
            stack: err.stack,
            hasFile: !!req.file,
            hasFiles: !!req.files
        });
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.getPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('user', ['name', 'avatarUrl', 'headline', 'education'])
            .populate({
                path: 'comments',
                populate: [
                    { path: 'user', select: 'name avatarUrl' },
                    getDeepPopulate(10)
                ]
            });
        res.json(posts.map(p => stripImpressionCountForNonOwner(p, req.user?.id)));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('user', ['name', 'avatarUrl', 'headline'])
            .populate({
                path: 'comments',
                populate: [
                    { path: 'user', select: 'name avatarUrl' },
                    getDeepPopulate(10)
                ]
            });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        res.json(stripImpressionCountForNonOwner(post, req.user?.id));
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
};

exports.getPostsByUserId = async (req, res) => {
    try {
        const posts = await Post.find({ user: req.params.user_id })
            .sort({ createdAt: -1 })
            .populate('user', ['name', 'avatarUrl', 'headline', 'education'])
            .populate({
                path: 'comments',
                populate: [
                    { path: 'user', select: 'name avatarUrl' },
                    getDeepPopulate(10)
                ]
            });

        res.json(posts.map(p => stripImpressionCountForNonOwner(p, req.user?.id)));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.recordImpression = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).select('_id user impressionCount');

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Avoid counting impressions from the post owner
        if (post.user.toString() === req.user.id) {
            return res.json({ impressionCount: post.impressionCount });
        }

        const now = new Date();
        const windowStart = new Date(now.getTime() - POST_IMPRESSION_WINDOW_MS);

        const recentImpression = await PostImpression.findOne({
            post: req.params.id,
            viewer: req.user.id,
            impressedAt: { $gte: windowStart }
        });

        if (recentImpression) {
            // Refresh TTL without incrementing the aggregate counter
            await PostImpression.updateOne({ _id: recentImpression._id }, { $set: { impressedAt: now } });
            return res.json({ ok: true });
        }

        await PostImpression.findOneAndUpdate(
            { post: req.params.id, viewer: req.user.id },
            { $set: { impressedAt: now } },
            { upsert: true }
        );

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { impressionCount: 1 } },
            { new: true, select: 'impressionCount' }
        );

        // Notify the post owner in real-time
        try {
            const ownerId = post.user.toString();
            const ownerSocket = getUserSocket(ownerId);
            if (ownerSocket) {
                getIO().to(ownerSocket).emit('post_impression_updated', {
                    postId: post._id.toString(),
                    impressionCount: updatedPost.impressionCount
                });
            }
        } catch (socketErr) {
            // Socket is optional; don't fail the request.
            console.warn('Socket emit failed:', socketErr.message);
        }

        // Only the owner should ever see impressionCount; viewers just get an ack.
        res.json({ ok: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check user
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await post.deleteOne();

        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
};

exports.likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // Check if the post has already been liked
        if (post.likes.includes(req.user.id)) {
            // Unlike
            const removeIndex = post.likes.indexOf(req.user.id);
            post.likes.splice(removeIndex, 1);
        } else {
            // Like
            post.likes.unshift(req.user.id);
        }

        await post.save();
        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.commentPost = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findById(req.user.id).select('-password');
        const post = await Post.findById(req.params.id);

        const newComment = {
            text: req.body.text,
            user: req.user.id
        };

        post.comments.unshift(newComment);

        await post.save();

        // Create Notification
        if (post.user.toString() !== req.user.id) {
            const newNotification = new Notification({
                user: post.user,
                type: 'comment',
                fromUser: req.user.id,
                post: post.id
            });
            await newNotification.save();
        }

        // Need to populate the user in the comments to return fully formed data
        const updatedPost = await Post.findById(req.params.id)
            .populate('user', ['name', 'avatarUrl', 'headline'])
            .populate('comments.user', ['name', 'avatarUrl'])
            .populate('comments.replies.user', ['name', 'avatarUrl']);

        res.json(updatedPost.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // Pull out comment
        const comment = post.comments.find(
            comment => comment.id === req.params.comment_id
        );

        // Make sure comment exists
        if (!comment) {
            return res.status(404).json({ msg: 'Comment does not exist' });
        }

        // Check user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Get remove index
        const removeIndex = post.comments
            .map(comment => comment.id)
            .indexOf(req.params.comment_id);

        post.comments.splice(removeIndex, 1);

        await post.save();

        const updatedPost = await Post.findById(req.params.id)
            .populate('comments.user', ['name', 'avatarUrl'])
            .populate('comments.replies.user', ['name', 'avatarUrl']);

        res.json(updatedPost.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.replyToComment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const post = await Post.findById(req.params.id);
        
        // Helper function to find comment/reply recursively
        const findComment = (comments, targetId) => {
            for (let comment of comments) {
                if (comment.id === targetId) {
                    return comment;
                }
                if (comment.replies && comment.replies.length > 0) {
                    const found = findComment(comment.replies, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        const targetComment = findComment(post.comments, req.params.comment_id);

        if (!targetComment) {
            return res.status(404).json({ msg: 'Comment does not exist' });
        }

        const newReply = {
            text: req.body.text,
            user: req.user.id
        };

        if (!targetComment.replies) {
            targetComment.replies = [];
        }
        targetComment.replies.unshift(newReply);

        await post.save();

        // Populate user details - Recursive population is tricky, we'll do 3 levels for now
        const updatedPost = await Post.findById(req.params.id)
            .populate('user', ['name', 'avatarUrl', 'headline'])
            .populate('comments.user', ['name', 'avatarUrl'])
            .populate('comments.replies.user', ['name', 'avatarUrl'])
            .populate('comments.replies.replies.user', ['name', 'avatarUrl']);

        res.json(updatedPost.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
