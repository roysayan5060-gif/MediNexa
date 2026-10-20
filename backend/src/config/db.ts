import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (mongoUri && mongoUri.trim() !== '') {
      console.log(`[Database] Attempting connection to MongoDB Atlas / configured URI...`);
      await mongoose.connect(mongoUri);
      console.log(`[Database] Successfully connected to MongoDB at ${mongoose.connection.host}`);
    } else {
      console.log(`[Database] No MONGODB_URI provided. Starting in-memory MongoDB server for development...`);
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'doctor_x'
        }
      });
      const uri = memoryServer.getUri();
      await mongoose.connect(uri);
      console.log(`[Database] Successfully connected to In-Memory MongoDB at ${uri}`);
      console.log(`[Database] NOTE: To connect to MongoDB Atlas, add your connection string to backend/.env (MONGODB_URI=...)`);
    }

    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error]: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`[Database] Disconnected from MongoDB`);
    });
  } catch (error) {
    console.error(`[Database] Failed to connect:`, error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (error) {
    console.error(`[Database] Error disconnecting:`, error);
  }
};
