import express from 'express';
import { register, login, getMe, verifyPassword, updateProfile, changePassword } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
// Protected routes
router.get('/me', verifyToken, getMe);
router.post('/verify-password', verifyToken, verifyPassword);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

export default router;
