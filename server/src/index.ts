import { env } from './config/env.js';
import { buildApp } from './app.js';
import { execSync } from 'child_process';

const app = buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
  } catch (err: unknown) {
    // Windows workaround: tsx watch kills the previous process with TerminateProcess, which cannot be
    // caught by Node.js signal handlers (SIGTERM/SIGINT). This means app.close() never runs, so the
    // WebSocket server and port are not released. If EADDRINUSE, kill the old process and retry.
    if (err instanceof Error && 'code' in err && err.code === 'EADDRINUSE') {
      app.log.warn(`Port ${env.port} in use. killing old process...`);
      try {
        execSync(
          `powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort ${env.port} -State Listen).OwningProcess -Force"`,
        );
      } catch {
        // Process may have already died
      }
      // Retry after short delay
      // Uncomment & increase delay if port doesn't reliably get released immediately
      // await new Promise((resolve) => setTimeout(resolve, 1));
      await app.listen({ port: env.port, host: '0.0.0.0' });
    } else {
      throw err;
    }
  }
};

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
