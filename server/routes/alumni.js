const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumniController');

// Get all alumni or search by name
router.get('/', alumniController.getAlumni);

module.exports = router;
