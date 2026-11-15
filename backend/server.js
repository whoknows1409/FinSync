// Entry point: connects to MongoDB, starts the scheduled jobs and listens.
// The Express app itself (middleware and routes) lives in app.js so it can be
// loaded on its own, for example by tests.
const app = require('./app');
const mongoose = require('mongoose');

// Scheduled jobs
const { runStartupTasks } = require('./utils/cronJobs');

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/finsync';
console.log('Connecting to MongoDB...');
mongoose.connect(mongoUri)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  // Catch up on anything that fell due while the server was not running.
  // Runs in the background so it never delays incoming requests.
  runStartupTasks().catch(err => console.error('Startup tasks failed:', err));
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('MongoDB URI (first 20 chars):', mongoUri.substring(0, 20) + '...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
