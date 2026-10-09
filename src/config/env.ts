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
  ollamaUrl: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen3:4b',
  ollamaTimeoutMs: num(process.env.OLLAMA_TIMEOUT_MS, 180000),
  ollamaStatusTimeoutMs: num(process.env.OLLAMA_STATUS_TIMEOUT_MS, 3000),
  ollamaMaxLeads: num(process.env.OLLAMA_MAX_LEADS, 25),
  ollamaMaxHistory: num(process.env.OLLAMA_MAX_HISTORY, 10),
};

export const maxCsvBytes = env.maxCsvSizeMb * 1024 * 1024;
