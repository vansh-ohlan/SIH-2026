import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

class DatabasePool {
  private pool: Pool | null = null;
  private isInitialized = false;

  private initPool(): Pool {
    if (this.pool) return this.pool;

    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
    });

    this.isInitialized = true;
    return this.pool;
  }

  public getPool(): Pool {
    if (!this.pool) {
      return this.initPool();
    }
    return this.pool;
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed SQL query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query error', {
        text,
        params,
        duration,
        error: (error as Error).message
      });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    const pool = this.getPool();
    return pool.connect();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.query('SELECT 1 AS healthy');
      return res.rows.length > 0 && res.rows[0].healthy === 1;
    } catch (error) {
      logger.warn('Database health check failed', { error: (error as Error).message });
      return false;
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      logger.info('PostgreSQL connection pool closed');
    }
  }
}

export const db = new DatabasePool();
