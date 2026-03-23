import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { 
  createTask, 
  getProjectTasks, 
  getUserQueue, 
  reorderTasks, 
  updateTask, 
  deleteTask 
} from '../controllers/taskController.js';

const router = express.Router();

router.post('/project/:projectId', verifyToken, requireRole(['PM']), createTask);
router.get('/project/:projectId', verifyToken, getProjectTasks);

router.put('/reorder', verifyToken, reorderTasks);
router.get('/queue/:userId', verifyToken, getUserQueue);

router.put('/:taskId', verifyToken, updateTask);
router.delete('/:taskId', verifyToken, requireRole(['PM']), deleteTask);

export default router;
