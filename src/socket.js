import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  const onlineUsers = new Map(); // Tracks userId -> Set<socketId> (handles multiple tabs)

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Send immediate state to newly connected client
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // Join a project room for isolated project-wide updates
    socket.on('join_project', (projectId) => {
      socket.join(projectId);
      console.log(`Socket ${socket.id} joined project room: ${projectId}`);
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(projectId);
      console.log(`Socket ${socket.id} left project room: ${projectId}`);
    });

    // Specific user channels for Queue sorting events targeting a single dev constraint
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      
      // Track Presence
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);
      io.emit('online_users', Array.from(onlineUsers.keys()));
      
      console.log(`Socket ${socket.id} joined personal room: user_${userId}`);
    });

    socket.on('disconnect', () => {
      // Remove from Presence
      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            io.emit('online_users', Array.from(onlineUsers.keys()));
          }
          break;
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized! Ensure initSocket is called first.');
  }
  return io;
};
