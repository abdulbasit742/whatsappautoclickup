/**
 * worker.js — Standalone BullMQ worker process
 *
 * Start with:   node worker.js
 * Or in PM2:    pm2 start worker.js --name clientflow-worker
 *
 * This process runs all queue workers independently from the API server,
 * so heavy message-sending operations never block HTTP request handling.
 */

require('dotenv').config();

const messageWorker   = require('./modules/queue/workers/messageWorker');
const broadcastWorker = require('./modules/queue/workers/broadcastWorker');
const followupWorker  = require('./modules/queue/workers/followupWorker');

console.log('🔧 ClientFlow AI — Worker process started');
console.log(`   PID: ${process.pid}`);
console.log('   Workers: messageWorker, broadcastWorker, followupWorker');

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[Worker] Received ${signal} — shutting down gracefully...`);
  try {
    await Promise.all([
      messageWorker.close(),
      broadcastWorker.close(),
      followupWorker.close(),
    ]);
    console.log('[Worker] All workers closed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[Worker] Error during shutdown:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Worker] Uncaught exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worker] Unhandled rejection:', reason);
});
