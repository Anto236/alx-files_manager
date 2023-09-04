import AppContoller from '../controllers/AppController';

const express = require('express');

const router = express.Router();

router.get('/status', AppContoller.getStatus);
router.get('/stats', AppContoller.getStats);

module.exports = router;
