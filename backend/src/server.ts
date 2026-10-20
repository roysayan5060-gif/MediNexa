import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { startReminderScheduler, stopReminderScheduler } from './services/reminderScheduler';
import { seedInitialData } from './utils/seed';
import {
  saveDatabaseSnapshot,
  restoreDatabaseSnapshot,
  startPersistenceWorker,
} from './services/persistenceService';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB (Atlas or In-Memory fallback)
    await connectDB();

    // 2. Restore all registered users, clinics, doctors, appointments from on-disk storage
    const hasRestoredData = await restoreDatabaseSnapshot();

    // 3. Automatically seed initial sample accounts and realistic medical data if fresh DB
    if (!hasRestoredData) {
      await seedInitialData();
      await saveDatabaseSnapshot();
    }

    // 4. Start background reminder worker job
    startReminderScheduler(60000);

    // 5. Start continuous on-disk persistence worker (saves every 10s & on exit)
    startPersistenceWorker(10000);

    // 6. Start HTTP Server
    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🩺 DOCTOR X — FULL-STACK HEALTHCARE SERVER IS ACTIVE`);
      console.log(`🚀 REST API:    http://localhost:${PORT}/api`);
      console.log(`📖 API Docs:    http://localhost:${PORT}/api-docs`);
      console.log(`🩺 Health:      http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });

    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      try {
        await saveDatabaseSnapshot();
      } catch (e) {}
      stopReminderScheduler();
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Disconnected from DB. Exiting.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[Server Error]: Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
