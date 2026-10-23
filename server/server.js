const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const doctorsRouter = require('./routes/doctors');
const appointmentsRouter = require('./routes/appointments');
const recommendRouter = require('./routes/recommend');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/doctors', doctorsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/recommend', recommendRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Doctor X Healthcare Platform', time: new Date() });
});

// Fallback to index.html for single page client navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🩺 Doctor X Platform is running on port ${PORT}`);
  console.log(`👉 Web Interface: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
