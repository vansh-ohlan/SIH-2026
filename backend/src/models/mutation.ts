export type MutationDecision = 'approved' | 'rejected' | 'needs_review';

export interface MutationRequest {
  decision: MutationDecision;
  officer_id: string;
  notes: string;
}

export interface MutationResponse {
  status: 'recorded';
  audit_hash: string;
  timestamp: string;
}

export interface MutationAuditRecord {
  id: string;
  ulpid: string;
  decision: MutationDecision;
  officer_id: string;
  notes: string;
  timestamp: string;
  previous_hash: string;
  audit_hash: string;
}
