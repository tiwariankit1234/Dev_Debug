const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/devdebug';
    console.log(`Connecting to MongoDB at: ${connUri}...`);
    
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Please ensure your local MongoDB service is running (e.g. run "mongod" or start the MongoDB service).');
    process.exit(1);
  }
};

module.exports = connectDB;
