const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const recommendationController = require('../controllers/recommendationController');

// @route   GET api/recommendations
// @desc    Get recommended connections (mutuals -> shared org/school -> random)
// @access  Private
router.get('/', auth, recommendationController.getRecommendations);

// @route   GET api/recommendations/by-ids
// @desc    Rehydrate a cached recommendation queue by user IDs (preserves order)
// @access  Private
router.get('/by-ids', auth, recommendationController.getRecommendationsByIds);

module.exports = router;
