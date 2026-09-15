import { migrator } from '../../src/db/migrator';
import { seedDatabase, SYNTHETIC_SEED_PARCELS } from '../../src/db/seeder';
import { db } from '../../src/db/pool';

describe('Database Migrations and Seeding', () => {
  afterAll(async () => {
    await db.close();
  });

  describe('Migrator', () => {
    it('should read migrations directory and execute pending SQL scripts', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn()
      };

      const getClientSpy = jest
        .spyOn(db, 'getClient')
        .mockResolvedValue(mockClient as unknown as ReturnType<typeof db.getClient> extends Promise<infer U> ? U : never);

      const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT name FROM schema_migrations')) {
          return {
            rows: [],
            rowCount: 0,
            command: 'SELECT',
            oid: 0,
            fields: []
          };
        }
        return {
          rows: [],
          rowCount: 0,
          command: 'CREATE',
          oid: 0,
          fields: []
        };
      });

      const newlyExecuted = await migrator.runMigrations();
      expect(newlyExecuted.length).toBeGreaterThanOrEqual(3);
      expect(newlyExecuted).toContain('001_enable_postgis.sql');
      expect(newlyExecuted).toContain('002_create_parcels_table.sql');
      expect(newlyExecuted).toContain('003_create_mutations_table.sql');

      getClientSpy.mockRestore();
      querySpy.mockRestore();
    });
  });

  describe('Seeder', () => {
    it('should contain the primary demo parcel PB-LDH-0042 with area mismatch', () => {
      const p42 = SYNTHETIC_SEED_PARCELS.find((p) => p.ulpid === 'PB-LDH-0042');
      expect(p42).toBeDefined();
      expect(p42?.owner_name).toBe('Ramesh Kumar');
      expect(p42?.ror_area_sqm).toBe(1250);
      expect(p42?.surveyed_area_sqm).toBe(1180);
      expect(p42?.area_sqm).toBe(1250);
      expect(p42?.land_use).toBe('Residential');
      expect(p42?.tax_paid).toBe(true);
      expect(p42?.tax_last_paid).toBe('2026-03-01');
    });

    it('should run seedDatabase inserting parcels and mutations within a transaction', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO parcels')) {
            return { rows: [{ id: 'mock-parcel-uuid' }], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }),
        release: jest.fn()
      };

      const getClientSpy = jest
        .spyOn(db, 'getClient')
        .mockResolvedValue(mockClient as unknown as ReturnType<typeof db.getClient> extends Promise<infer U> ? U : never);

      await expect(seedDatabase()).resolves.not.toThrow();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      getClientSpy.mockRestore();
    });
  });
});
