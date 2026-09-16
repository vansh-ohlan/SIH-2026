export interface OcrExtractionResponse {
  owner: string;
  area: number;
  survey_no: string;
  confidence: number;
}

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface DecisionSupportFinding {
  type: string;
  description: string;
  severity: AnomalySeverity;
  what_compared: string;
  what_differs: string;
  why_flagged: string;
  source: string;
}

export interface DecisionSupportReport {
  ulpid: string;
  ocr_extracted: OcrExtractionResponse;
  stored_parcel: {
    owner_name: string;
    ror_area_sqm: number;
    surveyed_area_sqm: number;
    land_use: string;
  } | null;
  confidence_assessment: {
    score: number;
    status: 'manual_verification_required' | 'acceptable_for_review';
    display_message: string;
  };
  anomalies: DecisionSupportFinding[];
  recommended_review_status: 'approved_candidate' | 'needs_review' | 'disputed';
  disclaimer: string;
}

