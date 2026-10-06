import express from 'express';
import { register, login, refresh, logout, getMe, verifyPassword, updateProfile, changePassword } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Auth-specific rate limit on the two brute-force targets
router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);

// Token management — no verifyToken needed (refresh token is the credential)
router.post('/refresh',  refresh);   // reads httpOnly cookie → issues new access token
router.post('/logout',   logout);    // clears httpOnly cookie

// Protected routes (covered by the global apiLimiter in server.js)
router.get('/me',                verifyToken, getMe);
router.post('/verify-password',  verifyToken, verifyPassword);
router.put('/profile',           verifyToken, updateProfile);
router.put('/change-password',   verifyToken, changePassword);

export default router;
