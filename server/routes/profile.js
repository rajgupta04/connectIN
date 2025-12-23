const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { check } = require('express-validator');
const profileController = require('../controllers/profileController');

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Private
router.get('/user/:user_id', auth, profileController.getProfileById);

// @route   PUT api/profile
// @desc    Update profile (headline, location, company, about, avatar)
// @access  Private
router.put(
    '/',
    [auth, upload.single('avatar')],
    profileController.updateProfile
);

// @route   POST api/profile/upload-avatar
// @desc    Upload avatar
// @access  Private
router.post(
    '/upload-avatar',
    [auth, upload.single('avatar')],
    profileController.updateProfile
);

// @route   POST api/profile/upload-cover
// @desc    Upload cover photo
// @access  Private
router.post(
  '/upload-cover',
  [auth, upload.single('cover')],
  profileController.updateProfile
);

// @route   PUT api/profile/experience
// @desc    Add profile experience
// @access  Private
router.put(
    '/experience',
    [
        auth,
        [
            check('title', 'Title is required').not().isEmpty(),
            check('company', 'Company is required').not().isEmpty(),
            check('from', 'From date is required').not().isEmpty()
        ]
    ],
    profileController.addExperience
);

// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  Private
router.delete('/experience/:exp_id', auth, profileController.deleteExperience);

// @route   PUT api/profile/education
// @desc    Add profile education
// @access  Private
router.put(
  '/education',
  [
    auth,
    [
      check('school', 'School is required').not().isEmpty(),
      check('degree', 'Degree is required').not().isEmpty(),
      check('fieldOfStudy', 'Field of study is required').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty()
    ]
  ],
  profileController.addEducation
);

// @route   DELETE api/profile/education/:edu_id
// @desc    Delete education from profile
// @access  Private
router.delete('/education/:edu_id', auth, profileController.deleteEducation);

module.exports = router;
