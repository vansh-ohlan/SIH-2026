export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaString = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.debug(this.formatLog('debug', message, meta));
    }
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(this.formatLog('info', message, meta));
    }
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.warn(this.formatLog('warn', message, meta));
    }
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error(this.formatLog('error', message, meta));
    }
  }
}

export const logger = new Logger();
