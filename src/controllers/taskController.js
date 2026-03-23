import { PrismaClient } from '@prisma/client';
import { getIO } from '../socket.js';
const prisma = new PrismaClient();

// Create a new task (PM only)
export const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, assigned_to, priority } = req.body;

    if (!title || !assigned_to) {
      return res.status(400).json({ message: 'Title and assigned developer are required' });
    }

    // Verify assignment user belongs to the project
    const member = await prisma.projectMember.findUnique({
      where: { user_id_project_id: { user_id: assigned_to, project_id: projectId } }
    });

    if (!member) {
      return res.status(400).json({ message: 'Assigned user must be a member of the project' });
    }

    // Find the max position in the assigned user's queue to append it at the end
    const maxPositionTask = await prisma.task.findFirst({
      where: { assigned_to, status: { not: 'DONE' } },
      orderBy: { position: 'desc' }
    });

    const newPosition = maxPositionTask ? maxPositionTask.position + 1 : 0;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assigned_to,
        project_id: projectId,
        priority: priority || 0,
        position: newPosition
      }
    });

    const activity = await prisma.activityEvent.create({
      data: {
        project_id: projectId,
        task_id: task.id,
        user_id: req.user.id,
        action: 'CREATED_TASK',
        details: `Created task '${task.title}'`
      },
      include: { user: { select: { name: true } } }
    });

    const io = getIO();
    io.to(projectId).emit('task_created', task);
    io.to(`user_${assigned_to}`).emit('task_created', task);
    io.to(projectId).emit('new_activity', activity);

    return res.status(201).json(task);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all tasks for a project
export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { project_id: projectId },
      include: {
        assignee: { select: { id: true, name: true, email: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get active queue for a specific developer
export const getUserQueue = async (req, res) => {
  try {
    const { userId } = req.params;

    // optionally: users can only see their own queue or PMs can see any queue
    if (req.user.id !== userId && req.user.role !== 'PM') {
      return res.status(403).json({ message: 'Unauthorized to view this queue' });
    }

    const tasks = await prisma.task.findMany({
      where: {
        assigned_to: userId,
        // status: { not: 'DONE' } // queue only shows active tasks generally
      },
      include: {
        project: { select: { id: true, name: true } }
      },
      orderBy: { position: 'asc' }
    });
    return res.json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Bulk update task positions (Drag & Drop Reordering)
export const reorderTasks = async (req, res) => {
  try {
    const { tasks } = req.body; // Expects [{ id: 'uuid', position: 0 }, { id: 'uuid', position: 1 }]

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ message: 'Invalid payload format' });
    }

    // Execute bulk update safely in a transaction
    const updatePromises = tasks.map(task =>
      prisma.task.update({
        where: { id: task.id },
        data: { position: task.position }
      })
    );

    await prisma.$transaction(updatePromises);

    if (req.user?.id) {
      getIO().to(`user_${req.user.id}`).emit('queue_reordered', tasks);
    }

    return res.json({ message: 'Queue reordered successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update task status and properties
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, assigned_to } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) return res.status(404).json({ message: 'Task not found' });

    // Enforce role boundaries: Developers can only update status/description of own tasks
    if (req.user.role === 'DEVELOPER' && existingTask.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own assigned tasks' });
    }

    const updateData = { title, description, status, priority, assigned_to };

    // Handle timestamp updates if status transitions
    if (status && status !== existingTask.status) {
      if (status === 'IN_PROGRESS' && !existingTask.started_at) {
        updateData.started_at = new Date();
      }
      if (status === 'DONE') {
        updateData.completed_at = new Date();
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    const io = getIO();
    io.to(updatedTask.project_id).emit('task_updated', updatedTask);
    io.to(`user_${updatedTask.assigned_to}`).emit('task_updated', updatedTask);

    if (status && status !== existingTask.status) {
      const activity = await prisma.activityEvent.create({
        data: {
          project_id: updatedTask.project_id,
          task_id: updatedTask.id,
          user_id: req.user.id,
          action: 'MOVED_TASK',
          details: `Moved task '${updatedTask.title}' to ${status.replace('_', ' ')}`
        },
        include: { user: { select: { name: true } } }
      });
      io.to(updatedTask.project_id).emit('new_activity', activity);
    }

    return res.json(updatedTask);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a task (PM only)
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ message: 'Not found' });

    await prisma.task.delete({ where: { id: taskId } });

    const activity = await prisma.activityEvent.create({
      data: {
        project_id: task.project_id,
        user_id: req.user.id,
        action: 'DELETED_TASK',
        details: `Deleted task '${task.title}'`
      },
      include: { user: { select: { name: true } } }
    });

    const io = getIO();
    io.to(task.project_id).emit('task_deleted', taskId);
    io.to(`user_${task.assigned_to}`).emit('task_deleted', taskId);
    io.to(task.project_id).emit('new_activity', activity);

    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
