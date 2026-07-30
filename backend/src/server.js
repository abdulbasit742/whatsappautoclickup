require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const config = require('./config');
const logger = require('./shared/utils/logger');
const emitter = require('./shared/events/eventEmitter');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    socket.userId = decoded.userId;
    socket.orgId = decoded.orgId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.info(`[WS] User ${socket.userId} connected`);

  socket.join(`org:${socket.orgId}`);

  socket.on('join:conversation', (convId) => {
    socket.join(`conv:${convId}`);
  });

  socket.on('leave:conversation', (convId) => {
    socket.leave(`conv:${convId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`[WS] User ${socket.userId} disconnected`);
  });
});

emitter.on('message:new', ({ orgId, convId, message }) => {
  io.to(`org:${orgId}`).emit('new_message', { convId, message });
  io.to(`conv:${convId}`).emit('new_message', { message });
});

emitter.on('conversation:updated', ({ orgId, conversation }) => {
  io.to(`org:${orgId}`).emit('conversation_updated', { conversation });
});

emitter.on('notification:new', ({ orgId, userId, notification }) => {
  io.to(`org:${orgId}`).emit('notification', { userId, notification });
});

emitter.on('campaign:progress', ({ orgId, campaignId, progress }) => {
  io.to(`org:${orgId}`).emit('campaign_progress', { campaignId, progress });
});

const PORT = config.port;

server.listen(PORT, () => {
  logger.info(`[Server] ClientFlow backend running on port ${PORT} (${config.env})`);
  logger.info(`[Server] Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  logger.error('[Server] Fatal error:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('[Process] Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('[Process] Uncaught exception:', err);
  process.exit(1);
});

module.exports = { server, io };
