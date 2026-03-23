import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { initSocket } from './socket.js';

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
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'QueueFlow API is running' });
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
