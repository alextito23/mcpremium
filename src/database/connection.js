/**
 * Database Connection Module
 * Handles MongoDB connection and provides database instances
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * Connect to MongoDB database
 * @returns {Promise<boolean>} Connection status
 */
async function connect() {
    if (isConnected) {
        logger.info('Already connected to MongoDB', 'DATABASE');
        return true;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri === 'your_mongodb_uri_here') {
        logger.warn('MongoDB URI not configured. Using in-memory storage.', 'DATABASE');
        return false;
    }

    try {
        await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        logger.success('Connected to MongoDB', 'DATABASE');

        // Handle connection events
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected', 'DATABASE');
            isConnected = false;
        });

        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB error: ${err.message}`, 'DATABASE');
        });

        return true;
    } catch (err) {
        logger.error(`Failed to connect to MongoDB: ${err.message}`, 'DATABASE');
        return false;
    }
}

/**
 * Disconnect from MongoDB
 */
async function disconnect() {
    if (!isConnected) return;

    try {
        await mongoose.disconnect();
        isConnected = false;
        logger.info('Disconnected from MongoDB', 'DATABASE');
    } catch (err) {
        logger.error(`Error disconnecting from MongoDB: ${err.message}`, 'DATABASE');
    }
}

/**
 * Check if connected to MongoDB
 * @returns {boolean} Connection status
 */
function isDbConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
    connect,
    disconnect,
    isDbConnected,
    mongoose
};
