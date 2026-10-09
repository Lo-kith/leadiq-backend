import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`[db] connected to ${maskUri(env.mongodbUri)}`);
}

function maskUri(uri: string): string {
  return uri.replace(/\/\/([^@]+)@/, '//***:***@');
}
