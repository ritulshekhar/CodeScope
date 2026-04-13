const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`⚠️  MongoDB unavailable: ${err.message}`);
    console.warn(`   Server continuing without MongoDB — /api/demo routes will still work.`);
    console.warn(`   Start MongoDB to enable /api/auth and /api/scans routes.`);
    // Do NOT call process.exit() — allow server to keep running
  }
};

module.exports = connectDB;
