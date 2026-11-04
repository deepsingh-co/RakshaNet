import mongoose from 'mongoose';
import { env } from '../config/env.js';

/**
 * MongoDB connection with clear failure reporting. A safety backend that
 * cannot persist incidents must not pretend to be healthy — we exit.
 */
export async function connectDb(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5_000,
    });
    // eslint-disable-next-line no-console
    console.log(`[db] connected to ${conn.connection.name}`);
    return conn;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] connection failed:', (err as Error).message);
    throw err;
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
