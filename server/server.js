const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { isMongoConnected } = require('./db');
const authRouter = require('./routes/auth');
const doctorsRouter = require('./routes/doctors');
const appointmentsRouter = require('./routes/appointments');
const prescriptionsRouter = require('./routes/prescriptions');
const paymentsRouter = require('./routes/payments');
const clinicsRouter = require('./routes/clinics');
const recommendRouter = require('./routes/recommend');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Trust reverse proxy headers (Render, Cloudflare, Railway HTTPS termination)
app.set('trust proxy', 1);

// CORS configuration for local and deployed production environments
app.use(cors({
  origin: FRONTEND_URL === '*' ? '*' : FRONTEND_URL,
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static web application assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/clinics', clinicsRouter);
app.use('/api/recommend', recommendRouter);

// Health check endpoint with database & gateway readiness
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'MediNexa',
    tagline: 'One Platform. Better Connected Care.',
    service: 'MediNexa Unified Healthcare API Engine',
    database: {
      mongoConnected: isMongoConnected(),
      mode: isMongoConnected() ? 'MongoDB Atlas / Hosted' : 'Active Persistent Memory Store & SQLite Synced'
    },
    paymentGateway: {
      provider: 'Razorpay',
      mode: (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.startsWith('rzp_live')) ? 'LIVE' : 'TEST / SANDBOX'
    },
    timestamp: new Date().toISOString()
  });
});

// Single Page Application route fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Express server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🩺 MediNexa — One Platform. Better Connected Care.`);
    console.log(`🚀 Server listening on port: ${PORT}`);
    console.log(`🌐 Web Platform URL: http://localhost:${PORT}`);
    console.log(`🍃 Database Status: ${isMongoConnected() ? 'MongoDB Active' : 'Active Resilient Store'}`);
    console.log(`================================================================`);
  });
}

module.exports = app;
