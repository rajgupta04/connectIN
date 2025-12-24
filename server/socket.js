const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSockets = new Map(); // Map userId -> socketId

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*", // Allow all origins for now, restrict in production
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    if (socket.handshake.query && socket.handshake.query.token) {
      jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.decoded = decoded;
        next();
      });
    } else {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.decoded.user.id;
    userSockets.set(userId, socket.id);
    console.log(`User connected: ${userId}`);

    socket.on('call_invite', (payload) => {
      try {
        const { toUserId, callType, channelName } = payload || {};
        if (!toUserId || !channelName) return;

        const recipientSocketId = getUserSocket(toUserId);
        if (!recipientSocketId) return;

        io.to(recipientSocketId).emit('call_invite', {
          fromUserId: userId,
          callType: callType === 'audio' ? 'audio' : 'video',
          channelName
        });
      } catch (err) {
        console.error('call_invite error', err);
      }
    });

    socket.on('call_accept', (payload) => {
      try {
        const { toUserId, callType, channelName } = payload || {};
        if (!toUserId || !channelName) return;

        const recipientSocketId = getUserSocket(toUserId);
        if (!recipientSocketId) return;

        io.to(recipientSocketId).emit('call_accepted', {
          fromUserId: userId,
          callType: callType === 'audio' ? 'audio' : 'video',
          channelName
        });
      } catch (err) {
        console.error('call_accept error', err);
      }
    });

    socket.on('call_reject', (payload) => {
      try {
        const { toUserId, channelName } = payload || {};
        if (!toUserId || !channelName) return;

        const recipientSocketId = getUserSocket(toUserId);
        if (!recipientSocketId) return;

        io.to(recipientSocketId).emit('call_rejected', {
          fromUserId: userId,
          channelName
        });
      } catch (err) {
        console.error('call_reject error', err);
      }
    });

    socket.on('call_end', (payload) => {
      try {
        const { toUserId, channelName } = payload || {};
        if (!toUserId || !channelName) return;

        const recipientSocketId = getUserSocket(toUserId);
        if (!recipientSocketId) return;

        io.to(recipientSocketId).emit('call_ended', {
          fromUserId: userId,
          channelName
        });
      } catch (err) {
        console.error('call_end error', err);
      }
    });

    socket.on('disconnect', () => {
      userSockets.delete(userId);
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

const getUserSocket = (userId) => {
    return userSockets.get(userId);
};

module.exports = { initSocket, getIO, getUserSocket };
