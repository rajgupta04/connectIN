const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

let io;
const userSockets = new Map(); // Map userId -> socketId

const normalizeCallType = (value) => (value === 'audio' ? 'audio' : 'video');

const safeString = (value) => {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
};

const clampInt = (value, { min = 0, max = 60 * 60 * 24 } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const i = Math.floor(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
};

const formatDuration = (seconds) => {
  const s = clampInt(seconds, { min: 0, max: 60 * 60 * 24 });
  if (s === undefined) return undefined;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins <= 0) return `${rem}s`;
  return `${mins}m ${rem.toString().padStart(2, '0')}s`;
};

const formatCallTypeLabel = (callType) => (callType === 'audio' ? 'Audio' : 'Video');

const saveCallLogMessage = async ({ senderId, recipientId, content }) => {
  try {
    if (!senderId || !recipientId || !content) return;
    const msg = new Message({
      sender: senderId,
      recipient: recipientId,
      content
    });
    await msg.save();
  } catch (err) {
    // Best-effort; never break call signaling.
    console.warn('[call-log] failed to save message:', err?.message || err);
  }
};

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

    const emitToUser = (toUserId, eventName, payload) => {
      const recipientSocketId = getUserSocket(toUserId);
      if (!recipientSocketId) return false;
      io.to(recipientSocketId).emit(eventName, payload);
      return true;
    };

    const buildIncomingPayload = ({ toUserId, callType, channelName, fromUserName, fromAvatarUrl }) => {
      const chan = safeString(channelName);
      const to = safeString(toUserId);
      if (!to || !chan) return null;

      return {
        fromUserId: userId,
        fromUserName: safeString(fromUserName),
        fromAvatarUrl: safeString(fromAvatarUrl),
        callType: normalizeCallType(callType),
        channelName: chan
      };
    };

    const handleInitiate = (payload, { legacy = false } = {}) => {
      try {
        const incoming = buildIncomingPayload(payload || {});
        if (!incoming) return;

        // Spec: send call:incoming
        emitToUser(payload.toUserId, 'call:incoming', incoming);

        // Back-compat: existing clients expect call_invite
        // If the initiator emitted a legacy event, preserve legacy-only behavior (avoid double signaling).
        if (legacy) {
          emitToUser(payload.toUserId, 'call_invite', {
            fromUserId: incoming.fromUserId,
            callType: incoming.callType,
            channelName: incoming.channelName
          });
        }
      } catch (err) {
        console.error('call:initiate error', err);
      }
    };

    const handleAccept = (payload, { legacy = false } = {}) => {
      try {
        const toUserId = safeString(payload?.toUserId);
        const channelName = safeString(payload?.channelName);
        if (!toUserId || !channelName) return;

        const out = {
          fromUserId: userId,
          callType: normalizeCallType(payload?.callType),
          channelName
        };

        // Spec: callee -> caller
        emitToUser(toUserId, 'call:accept', out);

        // Back-compat
        if (legacy) {
          emitToUser(toUserId, 'call_accepted', out);
        }
      } catch (err) {
        console.error('call:accept error', err);
      }
    };

    const handleReject = (payload, { legacy = false } = {}) => {
      try {
        const toUserId = safeString(payload?.toUserId);
        const channelName = safeString(payload?.channelName);
        if (!toUserId || !channelName) return;

        // Persist a missed call log entry in chat (callee rejected).
        const label = formatCallTypeLabel(normalizeCallType(payload?.callType));
        saveCallLogMessage({
          senderId: userId,
          recipientId: toUserId,
          content: `Missed ${label.toLowerCase()} call`
        });

        const out = {
          fromUserId: userId,
          channelName
        };

        emitToUser(toUserId, 'call:reject', out);
        if (legacy) {
          emitToUser(toUserId, 'call_rejected', out);
        }
      } catch (err) {
        console.error('call:reject error', err);
      }
    };

    const handleEnd = (payload, { legacy = false } = {}) => {
      try {
        const toUserId = safeString(payload?.toUserId);
        const channelName = safeString(payload?.channelName);
        if (!toUserId || !channelName) return;

        // Persist a completed call log entry if we have a duration.
        const duration = clampInt(payload?.durationSeconds, { min: 0, max: 60 * 60 * 24 });
        if (duration !== undefined) {
          const label = formatCallTypeLabel(normalizeCallType(payload?.callType));
          const formatted = formatDuration(duration);
          saveCallLogMessage({
            senderId: userId,
            recipientId: toUserId,
            content: `${label} call • ${formatted}`
          });
        }

        const out = {
          fromUserId: userId,
          channelName
        };

        emitToUser(toUserId, 'call:end', out);
        if (legacy) {
          emitToUser(toUserId, 'call_ended', out);
        }
      } catch (err) {
        console.error('call:end error', err);
      }
    };

    // Spec event names
    socket.on('call:initiate', (payload) => handleInitiate(payload, { legacy: false }));
    socket.on('call:accept', (payload) => handleAccept(payload, { legacy: false }));
    socket.on('call:reject', (payload) => handleReject(payload, { legacy: false }));
    socket.on('call:end', (payload) => handleEnd(payload, { legacy: false }));

    socket.on('call_invite', (payload) => {
      handleInitiate(payload, { legacy: true });
    });

    socket.on('call_accept', (payload) => {
      handleAccept(payload, { legacy: true });
    });

    socket.on('call_reject', (payload) => {
      handleReject(payload, { legacy: true });
    });

    socket.on('call_end', (payload) => {
      handleEnd(payload, { legacy: true });
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
