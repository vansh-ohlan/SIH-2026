import { postgisMutationRepository } from '../../src/repositories/postgisMutationRepository';
import { db } from '../../src/db/pool';
import { ParcelNotFoundError } from '../../src/utils/errors';

describe('PostgisMutationRepository', () => {
  afterAll(async () => {
    await db.close();
  });

  describe('recordMutation', () => {
    it('should successfully record mutation with previous audit hash chaining', async () => {
      const mockParcelId = '11111111-1111-1111-1111-111111111111';
      const mockPrevHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      const querySpy = jest
        .spyOn(db, 'query')
        // 1. Parcel lookup
        .mockResolvedValueOnce({
          rows: [{ id: mockParcelId }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        // 2. Previous hash lookup
        .mockResolvedValueOnce({
          rows: [{ audit_hash: mockPrevHash }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        // 3. Insert mutation
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        });

      const res = await postgisMutationRepository.recordMutation('PB-LDH-0042', {
        decision: 'approved',
        officer_id: 'OFF-102',
        notes: 'Verified against original survey map'
      });

      expect(res.status).toBe('recorded');
      expect(res.audit_hash).toBeDefined();
      expect(res.audit_hash).toHaveLength(64);
      expect(res.timestamp).toBeDefined();

      querySpy.mockRestore();
    });

    it('should throw ParcelNotFoundError when target parcel does not exist', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await expect(
        postgisMutationRepository.recordMutation('NON-EXISTENT-ULPID', {
          decision: 'approved',
          officer_id: 'OFF-102',
          notes: 'Test note'
        })
      ).rejects.toThrow(ParcelNotFoundError);

      querySpy.mockRestore();
    });
  });

  describe('getHistory', () => {
    it('should fetch historical mutation records with chained previous hashes', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            id: 'm1',
            ulpid: 'PB-LDH-0042',
            decision: 'approved',
            officer_id: 'OFF-101',
            notes: 'Initial registration',
            timestamp: '2011-04-12T10:00:00.000Z',
            audit_hash: 'hash111111111111111111111111111111111111111111111111111111111111'
          },
          {
            id: 'm2',
            ulpid: 'PB-LDH-0042',
            decision: 'approved',
            officer_id: 'OFF-102',
            notes: 'Second decision',
            timestamp: '2026-09-08T10:15:00.000Z',
            audit_hash: 'hash222222222222222222222222222222222222222222222222222222222222'
          }
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const history = await postgisMutationRepository.getHistory('PB-LDH-0042');
      expect(history).toHaveLength(2);
      expect(history[0].audit_hash).toBe(
        'hash111111111111111111111111111111111111111111111111111111111111'
      );
      expect(history[1].previous_hash).toBe(
        'hash111111111111111111111111111111111111111111111111111111111111'
      );

      querySpy.mockRestore();
    });
  });
});
