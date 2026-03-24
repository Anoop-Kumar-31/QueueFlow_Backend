import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { initSocket } from './socket.js';
import cron from 'node-cron';

dotenv.config();

const app = express();
const server = http.createServer(app);
export const prisma = new PrismaClient();

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Basic health check route
app.get('/api/health', async (req, res) => {
  res.status(200).json({ success: true, message: 'QueueFlow API is running' });
});

// Supabase Free Tier Keep-Alive
// Supabase pauses free-tier databases after 7 days of inactivity.
// This runs a cheap query every 5 days to keep the connection alive.
// NOTE: This is a CRON JOB for Supabase Free Tier
// const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
// setInterval(async () => {
//   try {
//     await prisma.$queryRaw`SELECT 1`;
//     console.log('[keep-alive] Supabase DB pinged successfully');
//   } catch (err) {
//     console.error('[keep-alive] DB ping failed:', err.message);
//   }
// }, FIVE_DAYS_MS);

// Supabase Free Tier Keep-Alive (Cron Job)
// Runs every 5 days at 00:00 to keep the database connection alive
cron.schedule('0 0 */5 * *', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[keep-alive] Supabase DB pinged successfully');
  } catch (err) {
    console.error('[keep-alive] DB ping failed:', err.message);
  }
});

import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
