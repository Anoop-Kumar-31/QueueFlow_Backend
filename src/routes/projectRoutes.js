import express from 'express';
import { createProject, getUserProjects, getProjectDetails, inviteUser, getProjectMembers, generateInviteCode, joinProjectWithCode, getProjectActivities, removeProjectMember } from '../controllers/projectController.js';
import { getProjectAnalytics } from '../controllers/analyticsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { checkProjectRole } from '../middleware/projectAuth.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(verifyToken); // All project routes require authentication

router.post('/join', joinProjectWithCode);
router.post('/', createProject); // Anyone can create a project and become its PM
router.get('/', getUserProjects);
router.get('/:id', getProjectDetails);
router.get('/:projectId/analytics', getProjectAnalytics);
router.get('/:id/members', getProjectMembers);
router.get('/:id/activities', getProjectActivities);

// Strict limit on invite-code generation (5 per 10 min) — prevents code-flood abuse
router.post('/:id/generate-invite', checkProjectRole(['PM']), strictLimiter, generateInviteCode);
router.post('/:id/invite', checkProjectRole(['PM']), inviteUser);
router.delete('/:id/members/:userId', removeProjectMember);

export default router;
