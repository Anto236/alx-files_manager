import AppContoller from '../controllers/AppController';
import UserController from '../controllers/UsersController';

const express = require('express');

const router = express.Router();

router.get('/status', AppContoller.getStatus);
router.get('/stats', AppContoller.getStats);
router.post('/users', UserController.postNew);

module.exports = router;
