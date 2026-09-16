import crypto from 'crypto';
import { MutationDecision } from '../models/mutation';

export interface HashChainInput {
  ulpid: string;
  decision: MutationDecision;
  officer_id: string;
  notes: string;
  timestamp: string;
  previous_hash: string;
}

/**
 * Computes a deterministic SHA-256 hash chaining to the previous mutation hash.
 * Provides a tamper-evident audit trail for land parcel mutations.
 */
export function generateAuditHash(input: HashChainInput): string {
  const payload = [
    input.previous_hash,
    input.ulpid,
    input.decision,
    input.officer_id,
    input.notes,
    input.timestamp
  ].join('|');

  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Verifies whether a given audit record matches its expected SHA-256 hash.
 * Reports true if tamper-evident integrity is intact, false if payload was altered.
 */
export function verifyAuditHash(record: HashChainInput & { audit_hash: string }): boolean {
  if (!record || !record.audit_hash) {
    return false;
  }
  const recomputed = generateAuditHash({
    ulpid: record.ulpid,
    decision: record.decision,
    officer_id: record.officer_id,
    notes: record.notes,
    timestamp: record.timestamp,
    previous_hash: record.previous_hash
  });
  return recomputed === record.audit_hash;
}

/**
 * Default genesis hash when no prior mutation exists for a parcel.
 */
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
