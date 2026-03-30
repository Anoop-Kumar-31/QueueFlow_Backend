import { prisma } from '../utils/prismaClient.js';

/**
 * Middleware to check if a user has specific roles within a project.
 * @param {string[]} allowedRoles - List of roles that are allowed to access the route.
 */
export const checkProjectRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id;
      const userId = req.user.id;

      if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project ID is required' });
      }

      const membership = await prisma.projectMember.findUnique({
        where: {
          user_id_project_id: {
            user_id: userId,
            project_id: projectId
          }
        }
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access forbidden: You don't have the required ${allowedRoles.join('/')} permissions for this project.` 
        });
      }

      // Store project role for use in the next controller
      req.projectRole = membership.role;
      next();
    } catch (error) {
      console.error('Check project role error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
};
