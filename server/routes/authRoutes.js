const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
