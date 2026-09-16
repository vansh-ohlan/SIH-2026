import { generateAuditHash, verifyAuditHash, GENESIS_HASH } from '../../src/audit/hashChain';

describe('Audit Hash Chain Generator', () => {
  it('should generate a deterministic SHA-256 hash for given inputs', () => {
    const input = {
      ulpid: 'PB-LDH-0042',
      decision: 'approved' as const,
      officer_id: 'OFF-102',
      notes: 'Verified against original survey map',
      timestamp: '2026-09-08T10:15:00Z',
      previous_hash: GENESIS_HASH
    };

    const hash1 = generateAuditHash(input);
    const hash2 = generateAuditHash(input);

    expect(hash1).toBeDefined();
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
    expect(hash1).toEqual(hash2);
  });

  it('should generate a different hash if any field changes', () => {
    const baseInput = {
      ulpid: 'PB-LDH-0042',
      decision: 'approved' as const,
      officer_id: 'OFF-102',
      notes: 'Verified against original survey map',
      timestamp: '2026-09-08T10:15:00Z',
      previous_hash: GENESIS_HASH
    };

    const hashOriginal = generateAuditHash(baseInput);

    const hashChangedDecision = generateAuditHash({
      ...baseInput,
      decision: 'rejected'
    });

    const hashChangedOfficer = generateAuditHash({
      ...baseInput,
      officer_id: 'OFF-103'
    });

    const hashChangedPrev = generateAuditHash({
      ...baseInput,
      previous_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    });

    expect(hashChangedDecision).not.toEqual(hashOriginal);
    expect(hashChangedOfficer).not.toEqual(hashOriginal);
    expect(hashChangedPrev).not.toEqual(hashOriginal);
  });

  describe('verifyAuditHash (Tamper-Evident Verification)', () => {
    const baseRecord = {
      ulpid: 'PB-LDH-0042',
      decision: 'approved' as const,
      officer_id: 'OFF-102',
      notes: 'Verified against original survey map',
      timestamp: '2026-09-08T10:15:00Z',
      previous_hash: GENESIS_HASH,
      audit_hash: ''
    };

    beforeEach(() => {
      baseRecord.audit_hash = generateAuditHash(baseRecord);
    });

    it('should return true for an untampered audit record', () => {
      expect(verifyAuditHash(baseRecord)).toBe(true);
    });

    it('should return false if notes were modified', () => {
      const tampered = { ...baseRecord, notes: 'Tampered notes altering survey finding' };
      expect(verifyAuditHash(tampered)).toBe(false);
    });

    it('should return false if decision was modified', () => {
      const tampered = { ...baseRecord, decision: 'rejected' as const };
      expect(verifyAuditHash(tampered)).toBe(false);
    });

    it('should return false if officer ID was modified', () => {
      const tampered = { ...baseRecord, officer_id: 'OFF-999' };
      expect(verifyAuditHash(tampered)).toBe(false);
    });

    it('should return false if previous hash chain link was modified', () => {
      const tampered = { ...baseRecord, previous_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' };
      expect(verifyAuditHash(tampered)).toBe(false);
    });

    it('should return false if timestamp was altered', () => {
      const tampered = { ...baseRecord, timestamp: '2026-09-08T11:00:00Z' };
      expect(verifyAuditHash(tampered)).toBe(false);
    });

    it('should return false if audit_hash is missing or invalid', () => {
      expect(verifyAuditHash({ ...baseRecord, audit_hash: '' })).toBe(false);
      expect(verifyAuditHash({ ...baseRecord, audit_hash: 'invalidhash' })).toBe(false);
    });
  });
});
