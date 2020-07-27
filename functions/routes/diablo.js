const express = require('express');
const router = express.Router();
const { notify } = require('../controllers/diablo');

//! Public route
router.post('/notify', notify);

module.exports = router;
