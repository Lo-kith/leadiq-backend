import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';

async function bootstrap(): Promise<void> {
  const app = createApp();

  try {
    await connectDatabase();
  } catch (error) {
    console.error('[db] Failed to connect to MongoDB.');
    console.error(`      URI: ${env.mongodbUri.replace(/\/\/([^@]+)@/, '//***:***@')}`);
    console.error(`      ${error instanceof Error ? error.message : String(error)}`);
    console.error('      Make sure a local MongoDB instance is running.');
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`[server] LeadIQ API listening on http://localhost:${env.port}`);
    console.log(`[server] Health: http://localhost:${env.port}/api/health`);
    console.log(`[server] Allowed origins: ${env.frontendOrigins.join(', ') || '(none configured)'}`);
  });
}

void bootstrap();
