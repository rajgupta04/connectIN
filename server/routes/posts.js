const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const uploadMedia = require('../middleware/uploadMedia');
const postController = require('../controllers/postController');

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post('/', auth, (req, res, next) => {
  const handler = uploadMedia.fields([
    { name: 'media', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]);

  handler(req, res, (err) => {
    if (err) {
      // Multer limits (size/type) or Cloudinary storage errors surface here
      console.error('Post media upload failed:', {
        message: err.message,
        name: err.name,
        code: err.code
      });

      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;

      const details = err.message || 'Upload failed';
      const isUnsupportedType =
        err.code === 'LIMIT_UNEXPECTED_FILE' ||
        /format/i.test(details) ||
        /not allowed/i.test(details) ||
        /unsupported/i.test(details);

      return res.status(status).json({
        msg: err.code === 'LIMIT_FILE_SIZE'
          ? 'Media must be 50MB or less'
          : (isUnsupportedType ? 'Unsupported media format' : 'Media upload failed'),
        details
      });
    }
    next();
  });
}, postController.createPost);

// @route   GET api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, postController.getPosts);

// @route   GET api/posts/:id
// @desc    Get post by ID
// @access  Private
router.get('/:id', auth, postController.getPostById);

// @route   GET api/posts/user/:user_id
// @desc    Get posts by user ID
// @access  Private
router.get('/user/:user_id', auth, postController.getPostsByUserId);

// @route   POST api/posts/:id/impression
// @desc    Record a post impression (deduped per user and time window)
// @access  Private
router.post('/:id/impression', auth, postController.recordImpression);

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', auth, postController.deletePost);

// @route   PUT api/posts/like/:id
// @desc    Like a post
// @access  Private
router.put('/like/:id', auth, postController.likePost);

// @route   POST api/posts/comment/:id
// @desc    Comment on a post
// @access  Private
router.post(
  '/comment/:id',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  postController.commentPost
);

// @route   POST api/posts/comment/:id/:comment_id/reply
// @desc    Reply to a comment
// @access  Private
router.post(
  '/comment/:id/:comment_id/reply',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  postController.replyToComment
);

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Delete comment
// @access  Private
router.delete('/comment/:id/:comment_id', auth, postController.deleteComment);

module.exports = router;
