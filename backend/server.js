const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./db');
const routes = require('./routes');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Connect to MongoDB Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static assets from frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Routes
app.use('/api/auth', require('./authRoutes'));
app.use('/api', routes);

// Base route for server checking
app.get('/health', (req, res) => {
  res.json({ status: 'UP', message: 'DevDebug Server running successfully.' });
});

// Fallback all non-API requests to the React frontend
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found. Please run npm run build in frontend directory.');
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` DevDebug Backend Server running on port ${PORT} `);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'} `);
  console.log(`===================================================`);
});
