import AppContoller from '../controllers/AppController';
import UserController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

const express = require('express');

const router = express.Router();

router.get('/status', AppContoller.getStatus);
router.get('/stats', AppContoller.getStats);
router.post('/users', UserController.postNew);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UserController.getMe);

module.exports = router;
