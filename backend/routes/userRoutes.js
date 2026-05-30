const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/test', userController.getTestAPI);

module.exports = router;