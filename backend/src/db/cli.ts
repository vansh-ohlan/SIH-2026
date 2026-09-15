import { migrator } from './migrator';
import { seedDatabase } from './seeder';
import { db } from './pool';
import { logger } from '../utils/logger';

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        logger.info('Running database migrations...');
        await migrator.runMigrations();
        logger.info('Migrations completed successfully.');
        break;

      case 'seed':
        logger.info('Seeding database...');
        await seedDatabase();
        logger.info('Database seeding completed successfully.');
        break;

      case 'reset':
        logger.warn('Resetting database and running migrations + seeds...');
        await migrator.resetDatabase();
        await migrator.runMigrations();
        await seedDatabase();
        logger.info('Database reset and seeded successfully.');
        break;

      default:
        // eslint-disable-next-line no-console
        console.error('Usage: tsx src/db/cli.ts <migrate|seed|reset>');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Database CLI operation failed', { error: (error as Error).message });
    process.exit(1);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  main();
}
