/**
 * @file src/config/db.js
 * @description MongoDB connection via Mongoose with logging and graceful shutdown.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * Connect to MongoDB. Call this once at server startup.
 * Subsequent calls are no-ops if already connected.
 */
const connectDB = async () => {
  if (isConnected) {
    logger.info('[DB] Already connected to MongoDB');
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    const conn = await mongoose.connect(uri, {
      // These options are set to sensible production defaults
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info(`[DB] Connected to MongoDB: ${conn.connection.host}`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('[DB] MongoDB connection closed (SIGINT)');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await mongoose.connection.close();
      logger.info('[DB] MongoDB connection closed (SIGTERM)');
      process.exit(0);
    });
  } catch (error) {
    logger.error(`[DB] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
