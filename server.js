/**
 * @file server.js
 * @description Application entry point.
 * Connects to MongoDB, starts the scheduler, and begins listening.
 */

require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startScheduler } = require('./src/services/schedulerService');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start background email scheduler
    startScheduler();

    // 3. Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════╗
║       OnIT India — AI Email Outreach Platform            ║
║       Server running on port ${PORT}                        ║
║       Environment: ${(process.env.NODE_ENV || 'development').padEnd(37)}║
╚══════════════════════════════════════════════════════════╝
      `.trim());
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('[Server] HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`[Server] Unhandled Rejection at: ${promise} | Reason: ${reason}`);
    });

    process.on('uncaughtException', (err) => {
      logger.error(`[Server] Uncaught Exception: ${err.message}`);
      process.exit(1);
    });

  } catch (error) {
    logger.error(`[Server] Failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();
