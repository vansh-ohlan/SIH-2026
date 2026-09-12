import http from 'http';
import { createApp } from './app/createApp';
import { config } from './config';
import { logger } from './utils/logger';

const app = createApp();
const server = http.createServer(app);

const PORT = config.PORT;

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(
      `Port ${PORT} is already in use. If running on macOS, disable AirPlay Receiver in System Settings or specify PORT=<other_port> in .env / environment variables.`
    );
  } else {
    logger.error(`Server error: ${err.message}`, { stack: err.stack });
  }
  process.exit(1);
});

server.listen(PORT, () => {
  logger.info(`Bhu-Setu API server listening on http://localhost:${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Allowed CORS origin: ${config.CORS_ORIGIN}`);
});

function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Gracefully shutting down Bhu-Setu API server...`);
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    logger.info('HTTP server closed cleanly. Exiting process.');
    process.exit(0);
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { app, server };
