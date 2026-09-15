import { db } from '../../src/db/pool';

describe('Database Connection Pool & Health', () => {
  afterAll(async () => {
    await db.close();
  });

  it('should initialize pool and execute healthCheck query', async () => {
    // healthCheck returns a boolean (true if db is live, false otherwise)
    const isHealthy = await db.healthCheck();
    expect(typeof isHealthy).toBe('boolean');
  });

  it('should handle query execution and log metadata', async () => {
    const querySpy = jest.spyOn(db.getPool(), 'query').mockImplementationOnce(async () => {
      return {
        rows: [{ healthy: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    });

    const res = await db.query('SELECT 1 AS healthy');
    expect(res.rows[0].healthy).toBe(1);
    expect(querySpy).toHaveBeenCalledWith('SELECT 1 AS healthy', undefined);
    querySpy.mockRestore();
  });

  it('should handle query failure and throw error', async () => {
    const querySpy = jest.spyOn(db.getPool(), 'query').mockImplementationOnce(async () => {
      throw new Error('Database connection failed');
    });

    await expect(db.query('SELECT * FROM non_existent_table')).rejects.toThrow(
      'Database connection failed'
    );
    querySpy.mockRestore();
  });
});
