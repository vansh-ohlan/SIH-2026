export interface AIResponse {
  status: 'recommend' | 'attention' | 'reject';
  reason: string;
  alternative?: string;
  requiredApproval?: string;
  source: 'gemini' | 'mockAI';
  dataAvailability: 'available' | 'unavailable';
}

export interface SatelliteChange {
  ndvi: number; // -1 to 1 mock value
  sar: number; // mock backscatter
  changeDetected: boolean;
}

export interface PermissionCase {
  caseId: string; // e.g. LS-2026-00182
  parcelUlpid: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface OfficerReview {
  riskScore: number; // 0-100
  complianceIssues: string[];
  suggestedActions: string[];
}
