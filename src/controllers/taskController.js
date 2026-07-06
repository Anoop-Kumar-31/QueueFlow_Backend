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
        priority: parseInt(priority) || 0,
        position: newPosition
      },
      // No sticky_notes included — fetched separately via GET /:taskId/notes
      include: {
        assignee: { select: { id: true, name: true, email: true } }
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

// Get all tasks for a project (paginated, no sticky_notes)
export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const skip  = (page - 1) * limit;

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where: { project_id: projectId },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          position: true,
          assigned_to: true,
          project_id: true,
          started_at: true,
          completed_at: true,
          created_at: true,
          assignee: { select: { id: true, name: true, email: true } },
          // sticky_notes intentionally omitted — use GET /:taskId/notes
          _count: { select: { sticky_notes: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.task.count({ where: { project_id: projectId } })
    ]);

    return res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get active queue for a specific developer (paginated, no sticky_notes)
export const getUserQueue = async (req, res) => {
  try {
    const { userId } = req.params;
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    // Users can only see their own queue; PMs can see any queue in a shared project
    if (req.user.id !== userId) {
      const pmCount = await prisma.projectMember.count({
        where: {
          role: 'PM',
          user_id: req.user.id,
          project: { members: { some: { user_id: userId } } }
        }
      });
      if (pmCount === 0) {
        return res.status(403).json({ message: 'Unauthorized to view this queue' });
      }
    }

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where: { assigned_to: userId },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          position: true,
          assigned_to: true,
          project_id: true,
          started_at: true,
          completed_at: true,
          created_at: true,
          project: { select: { id: true, name: true } },
          _count: { select: { sticky_notes: true } }
        },
        orderBy: { position: 'asc' },
        skip,
        take: limit
      }),
      prisma.task.count({ where: { assigned_to: userId } })
    ]);

    return res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Fetch sticky notes for a specific task (nested resource, paginated)
export const getTaskNotes = async (req, res) => {
  try {
    const { taskId } = req.params;
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { project_id: true }
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Verify the requester is a member of the parent project
    const membership = await prisma.projectMember.findUnique({
      where: { user_id_project_id: { user_id: req.user.id, project_id: task.project_id } }
    });
    if (!membership) return res.status(403).json({ message: 'Not a member of this project' });

    const [notes, total] = await prisma.$transaction([
      prisma.stickyNote.findMany({
        where: { task_id: taskId },
        select: {
          id: true,
          text: true,
          task_id: true,
          user_id: true,
          created_at: true,
          author: { select: { name: true } }
        },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit
      }),
      prisma.stickyNote.count({ where: { task_id: taskId } })
    ]);

    return res.json({
      success: true,
      data: notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total
      }
    });
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

    // Enforce role boundaries via membership
    const membership = await prisma.projectMember.findUnique({
      where: { user_id_project_id: { user_id: req.user.id, project_id: existingTask.project_id } }
    });

    if (!membership) return res.status(403).json({ message: 'Not a member of this project' });

    if (membership.role === 'DEVELOPER' && existingTask.assigned_to !== req.user.id) {
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
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        position: true,
        assigned_to: true,
        project_id: true,
        started_at: true,
        completed_at: true,
        created_at: true,
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { sticky_notes: true } }
      }
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

    // Contextual PM Check
    const membership = await prisma.projectMember.findUnique({
      where: { user_id_project_id: { user_id: req.user.id, project_id: task.project_id } }
    });
    if (!membership || membership.role !== 'PM') {
      return res.status(403).json({ message: "Only PMs of this project can delete tasks" });
    }

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

// Add a sticky note to a task (All Roles)
export const addStickyNote = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Note text is required' });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const note = await prisma.stickyNote.create({
      data: { text, task_id: taskId, user_id: req.user.id },
      select: {
        id: true,
        text: true,
        task_id: true,
        user_id: true,
        created_at: true,
        author: { select: { name: true } }
      }
    });

    const activity = await prisma.activityEvent.create({
      data: {
        project_id: task.project_id,
        task_id: task.id,
        user_id: req.user.id,
        action: 'ADDED_NOTE',
        details: `Added a sticky note to task '${task.title}'`
      },
      include: { user: { select: { name: true } } }
    });

    const io = getIO();
    io.to(task.project_id).emit('new_sticky_note', note);
    io.to(task.project_id).emit('new_activity', activity);

    return res.status(201).json(note);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update a sticky note
export const updateStickyNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { text } = req.body;

    const note = await prisma.stickyNote.findUnique({ where: { id: noteId }, include: { task: true } });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    if (note.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own notes' });
    }

    const updatedNote = await prisma.stickyNote.update({
      where: { id: noteId },
      data: { text },
      select: {
        id: true,
        text: true,
        task_id: true,
        user_id: true,
        created_at: true,
        author: { select: { name: true } }
      }
    });

    const activity = await prisma.activityEvent.create({
      data: {
        project_id: note.task.project_id,
        task_id: note.task.id,
        user_id: req.user.id,
        action: 'UPDATED_NOTE',
        details: `Updated a sticky note on task '${note.task.title}'`
      },
      include: { user: { select: { name: true } } }
    });

    const io = getIO();
    io.to(note.task.project_id).emit('note_updated', updatedNote);
    io.to(note.task.project_id).emit('new_activity', activity);

    return res.json(updatedNote);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a sticky note
export const deleteStickyNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await prisma.stickyNote.findUnique({ where: { id: noteId }, include: { task: true } });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    if (note.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own notes' });
    }

    await prisma.stickyNote.delete({ where: { id: noteId } });

    const activity = await prisma.activityEvent.create({
      data: {
        project_id: note.task.project_id,
        task_id: note.task.id,
        user_id: req.user.id,
        action: 'DELETED_NOTE',
        details: `Deleted a sticky note from task '${note.task.title}'`
      },
      include: { user: { select: { name: true } } }
    });

    const io = getIO();
    io.to(note.task.project_id).emit('note_deleted', { noteId, taskId: note.task_id });
    io.to(note.task.project_id).emit('new_activity', activity);

    return res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
