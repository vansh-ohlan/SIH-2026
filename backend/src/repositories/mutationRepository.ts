import { v4 as uuidv4 } from 'uuid';
import {
  MutationRequest,
  MutationResponse,
  MutationAuditRecord
} from '../models/mutation';
import { generateAuditHash, GENESIS_HASH } from '../audit/hashChain';

export interface IMutationRepository {
  recordMutation(ulpid: string, request: MutationRequest): Promise<MutationResponse>;
  getHistory(ulpid: string): Promise<MutationAuditRecord[]>;
}

export class MockMutationRepository implements IMutationRepository {
  private auditLogs: Map<string, MutationAuditRecord[]> = new Map();

  public async recordMutation(ulpid: string, request: MutationRequest): Promise<MutationResponse> {
    const history = this.auditLogs.get(ulpid) || [];
    const previousHash = history.length > 0 ? history[history.length - 1].audit_hash : GENESIS_HASH;
    const timestamp = new Date().toISOString();

    const auditHash = generateAuditHash({
      ulpid,
      decision: request.decision,
      officer_id: request.officer_id,
      notes: request.notes,
      timestamp,
      previous_hash: previousHash
    });

    const record: MutationAuditRecord = {
      id: uuidv4(),
      ulpid,
      decision: request.decision,
      officer_id: request.officer_id,
      notes: request.notes,
      timestamp,
      previous_hash: previousHash,
      audit_hash: auditHash
    };

    history.push(record);
    this.auditLogs.set(ulpid, history);

    return {
      status: 'recorded',
      audit_hash: auditHash,
      timestamp
    };
  }

  public async getHistory(ulpid: string): Promise<MutationAuditRecord[]> {
    const history = this.auditLogs.get(ulpid) || [];
    return JSON.parse(JSON.stringify(history));
  }
}

export const mutationRepository = new MockMutationRepository();
