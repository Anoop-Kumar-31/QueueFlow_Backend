import express from 'express';
import { createProject, getUserProjects, getProjectDetails, inviteUser, getProjectMembers, generateInviteCode, joinProjectWithCode, getProjectActivities } from '../controllers/projectController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.post('/join', joinProjectWithCode);
router.post('/', requireRole(['PM']), createProject);
router.get('/', getUserProjects);
router.get('/:id', getProjectDetails);
router.get('/:id/members', getProjectMembers);
router.get('/:id/activities', getProjectActivities);
router.post('/:id/generate-invite', requireRole(['PM']), generateInviteCode);
router.post('/:id/invite', requireRole(['PM']), inviteUser);

export default router;
