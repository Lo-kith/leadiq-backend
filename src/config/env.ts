import dotenv from 'dotenv';

dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: num(process.env.PORT, 3000),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/leadiq',
  frontendOrigins: [
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    process.env.FRONTEND_ORIGIN_PROD ?? '',
  ]
    .map((origin) => origin.trim())
    .filter(Boolean),
  maxCsvSizeMb: num(process.env.MAX_CSV_SIZE_MB, 20),
};

export const maxCsvBytes = env.maxCsvSizeMb * 1024 * 1024;
