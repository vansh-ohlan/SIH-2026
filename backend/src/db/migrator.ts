import fs from 'fs';
import path from 'path';
import { db } from './pool';
import { logger } from '../utils/logger';

export class Migrator {
  private migrationsDir: string;

  constructor(migrationsDir = path.join(__dirname, 'migrations')) {
    this.migrationsDir = migrationsDir;
  }

  private async ensureMigrationsTable(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async getExecutedMigrations(): Promise<string[]> {
    await this.ensureMigrationsTable();
    const res = await db.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY id ASC');
    return res.rows.map((r) => r.name);
  }

  public async runMigrations(): Promise<string[]> {
    await this.ensureMigrationsTable();

    if (!fs.existsSync(this.migrationsDir)) {
      logger.warn(`Migrations directory not found at: ${this.migrationsDir}`);
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const executed = await this.getExecutedMigrations();
    const newlyExecuted: string[] = [];

    for (const file of files) {
      if (executed.includes(file)) {
        logger.debug(`Migration already executed: ${file}`);
        continue;
      }

      const filePath = path.join(this.migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      logger.info(`Executing migration: ${file}...`);
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        newlyExecuted.push(file);
        logger.info(`Successfully executed migration: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Migration failed: ${file}`, { error: (error as Error).message });
        throw error;
      } finally {
        client.release();
      }
    }

    return newlyExecuted;
  }

  public async resetDatabase(): Promise<void> {
    logger.warn('Resetting database schema...');
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DROP TABLE IF EXISTS mutations CASCADE;');
      await client.query('DROP TABLE IF EXISTS parcels CASCADE;');
      await client.query('DROP TABLE IF EXISTS schema_migrations CASCADE;');
      await client.query('COMMIT');
      logger.info('Database tables dropped successfully.');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to reset database', { error: (error as Error).message });
      throw error;
    } finally {
      client.release();
    }
  }
}

export const migrator = new Migrator();
