import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { prisma } from '../utils/prismaClient.js';

dotenv.config();

// ─── Token helpers ────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production';

const getAccessSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return secret;
};

const getRefreshSecret = () => {
  // Gracefully fallback to JWT_SECRET if REFRESH_TOKEN_SECRET hasn't been set in host environment yet
  return process.env.REFRESH_TOKEN_SECRET || getAccessSecret();
};

/** Short-lived access token — lives in memory on the client only */
const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, getAccessSecret(), { expiresIn: '15m' });

/** Long-lived refresh token — delivered via httpOnly cookie, never exposed to JS */
const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, getRefreshSecret(), { expiresIn: '7d' });

/** Set the refresh token as a hardened httpOnly cookie */
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,           // JS cannot read this at all
    secure: IS_PROD,          // HTTPS-only in production; allow HTTP in dev
    sameSite: IS_PROD ? 'Strict' : 'Lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000,      // 7 days in ms
    path: '/api/auth',        // Cookie is only sent to /api/auth/* routes
  });
};

/** Clear the refresh cookie on logout */
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'Strict' : 'Lax',
    path: '/api/auth',
  });
};

// ─── Controllers ─────────────────────────────────────────────────────────────

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });

    res.status(201).json({
      success: true,
      data: { id: newUser.id, name: newUser.name, email: newUser.email },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    // Refresh token → secure httpOnly cookie (invisible to JavaScript)
    setRefreshCookie(res, refreshToken);

    // Access token → response body (frontend keeps it in memory/Redux only)
    res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        user: { id: user.id, name: user.name, email: user.email }
      },
      message: 'Logged in successfully'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/auth/refresh
 * Reads the httpOnly refreshToken cookie, verifies it, and returns a fresh
 * access token + rotates the refresh token cookie.
 */
export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, getRefreshSecret());
    } catch {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Rotate: issue a new refresh token and access token
    const newAccessToken = signAccessToken(user.id);
    const newRefreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      data: { token: newAccessToken, user }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/auth/logout
 * Clears the httpOnly refresh token cookie. The client should discard its
 * in-memory access token.
 */
export const logout = async (req, res) => {
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, created_at: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Verify the current password without making any changes (used for password update gating)
export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password' });

    res.status(200).json({ success: true, message: 'Password verified' });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update profile (name and/or email only)
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name && !email) return res.status(400).json({ success: false, message: 'Nothing to update' });

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ success: false, message: 'Email is already taken by another account' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name && { name }), ...(email && { email }) },
      select: { id: true, name: true, email: true, created_at: true }
    });

    res.status(200).json({ success: true, data: updated, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Change password — requires old password confirmation
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both old and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Old password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
