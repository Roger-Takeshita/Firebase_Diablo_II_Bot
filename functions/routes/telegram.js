const express = require('express');
const router = express.Router();
const { incomingMsg } = require('../controllers/telegram');

//! Public route
router.post('/msg', incomingMsg);

module.exports = router;
