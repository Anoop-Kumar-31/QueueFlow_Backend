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
  addStickyNote,
  updateStickyNote,
  deleteStickyNote
} from '../controllers/taskController.js';

const router = express.Router();

router.post('/project/:projectId', verifyToken, checkProjectRole(['PM']), createTask);
router.get('/project/:projectId', verifyToken, getProjectTasks);

router.put('/reorder', verifyToken, reorderTasks);
router.get('/queue/:userId', verifyToken, getUserQueue);

router.put('/:taskId', verifyToken, updateTask);
router.delete('/:taskId', verifyToken, deleteTask); // Role check moved inside this controller to pull project_id context from task

router.post('/:taskId/notes', verifyToken, addStickyNote);
router.put('/notes/:noteId', verifyToken, updateStickyNote);
router.delete('/notes/:noteId', verifyToken, deleteStickyNote);

export default router;
