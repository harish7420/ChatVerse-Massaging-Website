const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas or Local MongoDB instance
 */
const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/chatverse';
    
    // Check if connecting to actual DB or standard URI
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB instance: ${error.message}`);
    console.warn(`[MongoDB Warning] Operating in memory / offline fallback mode for local API endpoints.`);
    return false;
  }
};

module.exports = connectDB;
