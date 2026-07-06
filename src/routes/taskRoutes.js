import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { checkProjectRole } from '../middleware/projectAuth.js';
import {
  createTask,
  getProjectTasks,
  getUserQueue,
  reorderTasks,
  updateTask,
  deleteTask,
  getTaskNotes,
  addStickyNote,
  updateStickyNote,
  deleteStickyNote
} from '../controllers/taskController.js';

const router = express.Router();

// --- Static / collection routes first (must precede wildcard /:taskId routes) ---

// Project-scoped task list
router.post('/project/:projectId', verifyToken, checkProjectRole(['PM']), createTask);
router.get('/project/:projectId', verifyToken, getProjectTasks);

// Developer queue (ordering / reorder)
router.put('/reorder', verifyToken, reorderTasks);
router.get('/queue/:userId', verifyToken, getUserQueue);

// Sticky note CRUD — placed BEFORE /:taskId to prevent /notes/:noteId matching the wildcard
router.put('/notes/:noteId', verifyToken, updateStickyNote);
router.delete('/notes/:noteId', verifyToken, deleteStickyNote);

// --- Wildcard task routes ---

router.put('/:taskId', verifyToken, updateTask);
router.delete('/:taskId', verifyToken, deleteTask); // Role check inside controller

// Nested notes resource — avoids loading notes on every task list fetch
router.get('/:taskId/notes', verifyToken, getTaskNotes);
router.post('/:taskId/notes', verifyToken, addStickyNote);

export default router;
