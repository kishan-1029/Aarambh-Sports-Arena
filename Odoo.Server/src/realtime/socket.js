import { Server } from 'socket.io';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';

/** @type {import('socket.io').Server | null} */
let io = null;

/**
 * Mount Socket.IO on an HTTP server. Session/JWT handshake is a stub for Phase 1;
 * full auth lands in Phase 2. Keeps HTTP routes unaffected.
 * @param {import('http').Server} httpServer
 */
export function initSocket(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins.length ? config.corsOrigins : true,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    // Phase 1 stub: accept connection; prefer session cookie / token when Phase 2 lands.
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    socket.data.user = token ? { stub: true } : { anonymous: true };
    return next();
  });

  io.on('connection', (socket) => {
    logger.debug({ id: socket.id }, 'socket connected');

    socket.on('join', (room) => {
      if (typeof room === 'string' && room.length < 200) {
        socket.join(room);
      }
    });

    socket.on('leave', (room) => {
      if (typeof room === 'string') socket.leave(room);
    });

    socket.on('disconnect', () => {
      logger.debug({ id: socket.id }, 'socket disconnected');
    });
  });

  logger.info('Socket.IO mounted');
  return io;
}

export function getIo() {
  return io;
}

export function joinRoom(socket, room) {
  socket.join(room);
}

export function leaveRoom(socket, room) {
  socket.leave(room);
}

/**
 * @param {string} room
 * @param {string} event
 * @param {unknown} payload
 */
export function emitToRoom(room, event, payload) {
  if (!io) return;
  io.to(room).emit(event, payload);
}

export default { initSocket, getIo, joinRoom, leaveRoom, emitToRoom };
