import express from 'express';
import { createProject, getUserProjects, getProjectDetails, inviteUser, getProjectMembers, generateInviteCode, joinProjectWithCode, getProjectActivities, removeProjectMember } from '../controllers/projectController.js';
import { getProjectAnalytics } from '../controllers/analyticsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { checkProjectRole } from '../middleware/projectAuth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/join', joinProjectWithCode);
router.post('/', createProject); // Anyone can create a project and become its PM contextually
router.get('/', getUserProjects);
router.get('/:id', getProjectDetails);
router.get('/:projectId/analytics', getProjectAnalytics);
router.get('/:id/members', getProjectMembers);
router.get('/:id/activities', getProjectActivities);
router.post('/:id/generate-invite', checkProjectRole(['PM']), generateInviteCode);
router.post('/:id/invite', checkProjectRole(['PM']), inviteUser);
router.delete('/:id/members/:userId', removeProjectMember); // Logic for this shifted inside controller or stays same for self-removal

export default router;
