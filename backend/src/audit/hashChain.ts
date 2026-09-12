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
 * Default genesis hash when no prior mutation exists for a parcel.
 */
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
