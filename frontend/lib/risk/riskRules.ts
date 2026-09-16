import { RiskCategoryKey } from "./riskTypes";

export interface CategoryRuleConfig {
  key: RiskCategoryKey;
  label: string;
  weight: number; // percentage / max points
  description: string;
  authoritativeSource: string;
  prototypeConfidence: "high" | "medium" | "simulated";
}

export const RISK_CATEGORY_WEIGHTS: Record<RiskCategoryKey, CategoryRuleConfig> = {
  ownership: {
    key: "ownership",
    label: "Ownership Consistency",
    weight: 15,
    description: "Evaluates alignment between declared titleholder and revenue records.",
    authoritativeSource: "State Revenue Department (Jamabandi/Khasra)",
    prototypeConfidence: "high",
  },
  ror: {
    key: "ror",
    label: "Record of Rights (RoR)",
    weight: 10,
    description: "Evaluates RoR extent, Khewat/Khatauni continuity and parcel bounds.",
    authoritativeSource: "Directorate of Land Records",
    prototypeConfidence: "high",
  },
  registration: {
    key: "registration",
    label: "Registration History",
    weight: 10,
    description: "Audits deed execution, mutation trail, and chain-of-custody continuity.",
    authoritativeSource: "Sub-Registrar Office (e-Registration)",
    prototypeConfidence: "high",
  },
  mortgage: {
    key: "mortgage",
    label: "Mortgages & Encumbrances",
    weight: 15,
    description: "Checks active banking charges, registered mortgages, and statutory liens.",
    authoritativeSource: "CERSAI / Sub-Registrar Encumbrance Registry",
    prototypeConfidence: "medium",
  },
  dispute: {
    key: "dispute",
    label: "Dispute & Litigation Status",
    weight: 15,
    description: "Surfaces pending civil suits, boundary appeals, and revenue court cases.",
    authoritativeSource: "e-Courts Registry & Revenue Court Tracking",
    prototypeConfidence: "medium",
  },
  zoning: {
    key: "zoning",
    label: "Zoning & Land-Use Compliance",
    weight: 10,
    description: "Validates permitted master plan activities against actual cadastral zoning.",
    authoritativeSource: "Town & Country Planning Department",
    prototypeConfidence: "high",
  },
  master_plan: {
    key: "master_plan",
    label: "Master Plan Restrictions",
    weight: 0, // grouped under zoning (10% total)
    description: "Statutory reservation corridors, green belts, and arterial alignment buffers.",
    authoritativeSource: "Urban Development Authority",
    prototypeConfidence: "high",
  },
  building_permission: {
    key: "building_permission",
    label: "Building Permissions",
    weight: 5,
    description: "Checks municipal sanction drawings, layout approval, and setbacks.",
    authoritativeSource: "Municipal Corporation / Local Body Planning",
    prototypeConfidence: "simulated",
  },
  property_tax: {
    key: "property_tax",
    label: "Property Tax Status",
    weight: 5,
    description: "Audits annual municipal assessment, cleared receipts, and pending arrears.",
    authoritativeSource: "Municipal Assessment System",
    prototypeConfidence: "high",
  },
  environmental: {
    key: "environmental",
    label: "Environmental Restrictions",
    weight: 10,
    description: "Checks statutory overlaps with eco-sensitive sanctuaries, wetlands, and forests.",
    authoritativeSource: "Forest & Environment Department / MOEFCC",
    prototypeConfidence: "high",
  },
  infrastructure: {
    key: "infrastructure",
    label: "Nearby Infrastructure Clearances",
    weight: 0, // grouped with environmental & utilities
    description: "High-tension power line clearance, water mains, and stormwater buffer setbacks.",
    authoritativeSource: "State Electricity Transmission & Jal Board",
    prototypeConfidence: "medium",
  },
  satellite_change: {
    key: "satellite_change",
    label: "Satellite Change & Anomaly Indicators",
    weight: 5,
    description: "Multi-temporal NDVI & SAR change detection for unapproved physical alterations.",
    authoritativeSource: "Automated Earth Observation Engine (Stage 4 Prototype)",
    prototypeConfidence: "medium",
  },
};

export const RISK_SCORE_THRESHOLDS = {
  LOW_MAX: 29,
  MODERATE_MAX: 69,
  HIGH_MIN: 70,
};

export const STATUTORY_DISCLAIMER =
  "AI-generated risk indicators are for decision support only. They do not establish legal ownership, title validity, fraud, or statutory permission. Final verification must be performed through the appropriate statutory authority.";
