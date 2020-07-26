const express = require('express');
const router = express.Router();
const firebaseAuth = require('../utils/firebaseAuth');
const {
    signup,
    login,
    updateProfile,
    getProfile,
} = require('../controllers/users');

//! Public route
router.post('/signup', signup);
router.post('/login', login);

//! Private route
router.post('/profile', firebaseAuth, updateProfile);
router.get('/profile', firebaseAuth, getProfile);

module.exports = router;
