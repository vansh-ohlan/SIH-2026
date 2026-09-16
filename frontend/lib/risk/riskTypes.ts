export type RiskLevel = "LOW" | "MODERATE" | "HIGH";

export type RiskSeverity = "none" | "low" | "medium" | "high" | "critical";

export type DataConfidenceLevel = "high" | "medium" | "simulated" | "source_unavailable";

export type RiskCategoryKey =
  | "ownership"
  | "ror"
  | "registration"
  | "mortgage"
  | "dispute"
  | "zoning"
  | "master_plan"
  | "building_permission"
  | "property_tax"
  | "environmental"
  | "infrastructure"
  | "satellite_change";

export interface DataConfidenceItem {
  category: RiskCategoryKey;
  label: string;
  confidence: DataConfidenceLevel;
  confidenceText: string;
  sourceLabel: string;
  isAuthoritative: boolean;
}

export interface RiskFactor {
  category: RiskCategoryKey;
  categoryLabel: string;
  status: string;
  severity: RiskSeverity;
  pointsContribution: number; // 0 for clear/no risk, positive integer for risk
  maxCategoryWeight: number;
  explanation: string;
  dataSource: string;
  confidence: DataConfidenceLevel;
  confidenceText: string;
  isCompliant: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface RiskDriver {
  category: RiskCategoryKey;
  label: string;
  points: number;
  percentage: number;
  severity: RiskSeverity;
  summary: string;
}

export interface RiskRecommendation {
  id: string;
  category: RiskCategoryKey;
  title: string;
  actionText: string;
  priority: "high" | "medium" | "low" | "advisory";
  authorityToVerify: string;
  documentationRequired?: string;
}

export interface HistoricalRiskPoint {
  year: number;
  score: number;
  level: RiskLevel;
  primaryEvent?: string;
}

export interface RiskHistory {
  previousScore: number;
  currentScore: number;
  delta: number;
  deltaReason: string;
  timeline: HistoricalRiskPoint[];
}

export interface ParcelRiskAttributes {
  ulpid: string;
  ownerName: string;
  district: string;
  state: string;
  landUse: string;
  areaSqm: number;
  surveyedAreaSqm?: number;
  rorAreaSqm?: number;

  // 1. Ownership & RoR
  ownerMatchesRoR: boolean;
  ownershipMismatchReason?: string;
  khewatKhatauniVerified: boolean;
  areaDiscrepancySqm?: number;

  // 2. Registration & Title
  registrationVerified: boolean;
  registrationIrregularity?: string;
  unbrokenChainOfTitle: boolean;
  lastMutationType?: string;
  lastMutationDate?: string;

  // 3. Mortgages & Encumbrances
  hasActiveMortgage: boolean;
  mortgageDetails?: {
    lender: string;
    amount?: number;
    registeredDate?: string;
    loanType?: string;
    status: "active" | "cleared" | "under_dispute";
  };
  hasEncumbranceNotice: boolean;
  encumbranceDetails?: string;

  // 4. Disputes & Litigation
  hasPendingDispute: boolean;
  disputeDetails?: {
    caseNo?: string;
    court?: string;
    filingDate?: string;
    nature: string;
    status: "pending_trial" | "stay_order" | "disposed" | "none";
  };

  // 5. Zoning & Master Plan
  zoningCompliant: boolean;
  masterPlanRestrictionDetected: boolean;
  zoningDetails?: string;
  permittedUses?: string[];

  // 6. Building Permissions & Layout Sanction
  hasBuildingPermission: boolean;
  unapprovedLayoutDeviation: boolean;
  permissionDetails?: string;

  // 7. Property Tax Status
  taxPaid: boolean;
  taxArrearsAmount: number;
  taxLastPaidDate?: string;

  // 8. Environmental & Eco-Sensitive Restrictions
  hasEnvironmentalRestriction: boolean;
  ecoBufferOverlapDetected: boolean;
  ecoZoneDetails?: string;

  // 9. Nearby Infrastructure & Utilities
  utilityBufferOverlap: boolean;
  utilityType?: "power_grid" | "water_main" | "stormwater_drain";
  utilityDetails?: string;

  // 10. Satellite Change Detection & Temporal Anomalies
  satelliteAnomalyDetected: boolean;
  satelliteChangeDetails?: {
    changeType: "unauthorized_construction" | "boundary_push" | "waterbody_fill" | "none";
    confidenceScore: number;
    detectedDate: string;
    affectedAreaSqm: number;
  };
}

export interface RiskAnalysis {
  ulpid: string;
  ownerName: string;
  district: string;
  state: string;
  landUse: string;
  areaSqm: number;

  // Aggregate Scores
  score: number; // 0 to 100
  level: RiskLevel;
  totalIndicatorsEvaluated: number;
  activeRiskFlagsCount: number;
  analysisTimestamp: string;

  // Explainability Breakdown
  factors: RiskFactor[];
  topDrivers: RiskDriver[];
  recommendations: RiskRecommendation[];
  summaryText: string;
  disclaimer: string;
  dataConfidence: DataConfidenceItem[];
  history: RiskHistory;
}
