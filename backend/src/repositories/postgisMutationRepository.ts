import { db } from '../db/pool';
import { IMutationRepository } from './mutationRepository';
import {
  MutationRequest,
  MutationResponse,
  MutationAuditRecord
} from '../models/mutation';
import { generateAuditHash, GENESIS_HASH } from '../audit/hashChain';
import { ParcelNotFoundError } from '../utils/errors';

export class PostgisMutationRepository implements IMutationRepository {
  public async recordMutation(ulpid: string, request: MutationRequest): Promise<MutationResponse> {
    // 1. Verify parcel exists
    const parcelRes = await db.query<{ id: string }>(
      'SELECT id FROM parcels WHERE ulpid = $1',
      [ulpid]
    );

    if (parcelRes.rows.length === 0) {
      throw new ParcelNotFoundError();
    }

    const parcelId = parcelRes.rows[0].id;

    // 2. Fetch last mutation to chain audit hash
    const prevRes = await db.query<{ audit_hash: string }>(
      'SELECT audit_hash FROM mutations WHERE ulpid = $1 ORDER BY created_at DESC, id DESC LIMIT 1',
      [ulpid]
    );

    const previousHash = prevRes.rows.length > 0 ? prevRes.rows[0].audit_hash : GENESIS_HASH;
    const timestamp = new Date().toISOString();

    // 3. Compute SHA-256 chained audit hash
    const auditHash = generateAuditHash({
      ulpid,
      decision: request.decision,
      officer_id: request.officer_id,
      notes: request.notes,
      timestamp,
      previous_hash: previousHash
    });

    // 4. Persist mutation record in PostgreSQL
    await db.query(
      `
      INSERT INTO mutations (
        parcel_id, ulpid, mutation_date, mutation_type,
        from_owner, to_owner, decision, officer_id,
        notes, audit_hash, created_at
      ) VALUES (
        $1, $2, CURRENT_DATE, 'Mutation Review',
        '', '', $3, $4,
        $5, $6, $7
      )
      `,
      [
        parcelId,
        ulpid,
        request.decision,
        request.officer_id,
        request.notes,
        auditHash,
        timestamp
      ]
    );

    return {
      status: 'recorded',
      audit_hash: auditHash,
      timestamp
    };
  }

  public async getHistory(ulpid: string): Promise<MutationAuditRecord[]> {
    const sql = `
      SELECT 
        id,
        ulpid,
        decision,
        officer_id,
        notes,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS timestamp,
        audit_hash
      FROM mutations
      WHERE ulpid = $1
      ORDER BY created_at ASC, id ASC;
    `;

    const res = await db.query<{
      id: string;
      ulpid: string;
      decision: 'approved' | 'rejected' | 'needs_review';
      officer_id: string;
      notes: string;
      timestamp: string;
      audit_hash: string;
    }>(sql, [ulpid]);

    return res.rows.map((row, index) => ({
      id: row.id,
      ulpid: row.ulpid,
      decision: row.decision,
      officer_id: row.officer_id,
      notes: row.notes,
      timestamp: row.timestamp,
      previous_hash: index === 0 ? GENESIS_HASH : res.rows[index - 1].audit_hash,
      audit_hash: row.audit_hash
    }));
  }
}

export const postgisMutationRepository = new PostgisMutationRepository();
