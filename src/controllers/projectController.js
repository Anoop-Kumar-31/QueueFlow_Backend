import { prisma } from '../utils/prismaClient.js';

export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    // PM creates projects
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        created_by: req.user.id,
      }
    });

    // Automatically add the creator as a PM to the project
    await prisma.projectMember.create({
      data: {
        user_id: req.user.id,
        project_id: newProject.id,
        role: 'PM'
      }
    });

    res.status(201).json({ success: true, data: newProject, message: 'Project created successfully' });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUserProjects = async (req, res) => {
  try {
    // Only fetch projects where the user is a member
    const memberships = await prisma.projectMember.findMany({
      where: { user_id: req.user.id },
      include: {
        project: {
          include: {
            creator: {
              select: { name: true }
            }
          }
        }
      }
    });

    const projects = memberships.map(m => ({
      ...m.project,
      userRole: m.role,
      creatorName: m.project.creator?.name
    }));
    console.log(projects)

    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: check if user is a member of this project
    const membership = await prisma.projectMember.findUnique({
      where: {
        user_id_project_id: {
          user_id: req.user.id,
          project_id: id
        }
      }
    });

    if (!membership && req.user.role !== 'PM') {
      return res.status(403).json({ success: false, message: 'Access denied to this project' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const generateInviteCode = async (req, res) => {
  console.log("Generating the code...")
  try {
    const { id: projectId } = req.params;
    const { expiresInHours } = req.body;

    if (!expiresInHours) return res.status(400).json({ success: false, message: 'Expiration time required' });

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (expiresInHours * 60));

    const invite = await prisma.projectInvite.create({
      data: {
        code,
        project_id: projectId,
        created_by: req.user.id,
        expires_at: expiresAt
      }
    });

    res.json({ success: true, data: invite });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const joinProjectWithCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) return res.status(400).json({ success: false, message: 'Invite code required' });

    const invite = await prisma.projectInvite.findUnique({
      where: { code },
      include: { project: true }
    });

    if (!invite) return res.status(404).json({ success: false, message: 'Invalid invite code' });

    if (new Date() > invite.expires_at) {
      return res.status(400).json({ success: false, message: 'This invite code has expired. Please ask your PM for a new one.' });
    }

    const existing = await prisma.projectMember.findUnique({
      where: { user_id_project_id: { user_id: req.user.id, project_id: invite.project_id } }
    });

    if (existing) return res.status(400).json({ success: false, message: 'You are already a member of this project' });

    await prisma.projectMember.create({
      data: {
        user_id: req.user.id,
        project_id: invite.project_id,
        role: 'DEVELOPER'
      }
    });

    const activity = await prisma.activityEvent.create({
      data: {
        project_id: invite.project_id,
        user_id: req.user.id,
        action: 'JOINED_PROJECT',
        details: `Joined the workspace`
      },
      include: { user: { select: { name: true } } }
    });

    import('../socket.js').then(({ getIO }) => {
      getIO().to(invite.project_id).emit('new_activity', activity);
    });

    res.json({ success: true, data: invite.project, message: `Successfully joined ${invite.project.name}!` });
  } catch (error) {
    console.error('Join project error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProjectActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const activities = await prisma.activityEvent.findMany({
      where: { project_id: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const members = await prisma.projectMember.findMany({
      where: { project_id: id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const inviteUser = async (req, res) => {
  try {
    const { id } = req.params; // project ID
    const { email, role } = req.body;

    if (!email || !role) return res.status(400).json({ success: false, message: 'Email and role are required' });

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found in system' });

    const existingMember = await prisma.projectMember.findUnique({
      where: { user_id_project_id: { user_id: targetUser.id, project_id: id } }
    });

    if (existingMember) return res.status(400).json({ success: false, message: 'User is already a member of this project' });

    const newMember = await prisma.projectMember.create({
      data: {
        user_id: targetUser.id,
        project_id: id,
        role
      }
    });

    res.status(200).json({ success: true, data: newMember, message: 'User added to project successfully' });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
