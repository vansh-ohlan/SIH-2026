import { ParcelRiskAttributes, RiskAnalysis } from "./riskTypes";
import { calculateParcelRisk } from "./riskEngine";

/**
 * Multi-State Parcel Risk Attributes Dataset.
 * Each parcel has distinct underlying attributes evaluated by the deterministic calculation engine.
 */
export const MOCK_PARCEL_RISK_ATTRIBUTES: Record<string, ParcelRiskAttributes> = {
  // =========================================================================
  // 1. PB-LDH-0042: HERO SIH DEMO SCENARIO (HIGH RISK ~78 / 100)
  // =========================================================================
  "PB-LDH-0042": {
    ulpid: "PB-LDH-0042",
    ownerName: "Ramesh Kumar",
    district: "Ludhiana",
    state: "Punjab",
    landUse: "Residential",
    areaSqm: 1250,
    rorAreaSqm: 1250,
    surveyedAreaSqm: 1180, // 70 sqm variance (+10 risk)

    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    areaDiscrepancySqm: 70,

    registrationVerified: true,
    unbrokenChainOfTitle: true,
    lastMutationType: "Sale Deed",
    lastMutationDate: "2011-04-12",

    // Active Mortgage (+15 risk)
    hasActiveMortgage: true,
    mortgageDetails: {
      lender: "Punjab National Bank (Ludhiana Civil Lines Branch)",
      amount: 4500000,
      registeredDate: "2023-11-14",
      loanType: "Housing Term Loan / Mortgage Charge",
      status: "active",
    },
    hasEncumbranceNotice: false,

    // Pending Civil Dispute (+15 risk)
    hasPendingDispute: true,
    disputeDetails: {
      caseNo: "CS/2025/8924",
      court: "Court of Civil Judge (Senior Division), Ludhiana",
      filingDate: "2025-08-10",
      nature: "Civil Partition Suit & Boundary Title Challenge",
      status: "pending_trial",
    },

    // Zoning / Master Plan Restriction (+10 risk)
    zoningCompliant: false,
    masterPlanRestrictionDetected: true,
    zoningDetails:
      "Master Plan 2031 sets 6m road-widening setback reservation; multi-storey residential development restricted.",
    permittedUses: ["Single-family low-density residential only"],

    // Building Permissions (+5 risk)
    hasBuildingPermission: false,
    unapprovedLayoutDeviation: true,
    permissionDetails: "Unsanctioned rear expansion noticed; completion certificate not on record.",

    // Property Tax: Paid (0 risk)
    taxPaid: true,
    taxArrearsAmount: 0,
    taxLastPaidDate: "2026-03-01",

    // Environmental: Clean (0 risk)
    hasEnvironmentalRestriction: false,
    ecoBufferOverlapDetected: false,

    utilityBufferOverlap: false,

    // Satellite Anomaly (+5 risk)
    satelliteAnomalyDetected: true,
    satelliteChangeDetails: {
      changeType: "unauthorized_construction",
      confidenceScore: 0.88,
      detectedDate: "2026-08-25",
      affectedAreaSqm: 42,
    },
  },

  // =========================================================================
  // 2. PB-LDH-0044: MODERATE RISK DUE TO COMMERCIAL MORTGAGE (~35 / 100)
  // =========================================================================
  "PB-LDH-0044": {
    ulpid: "PB-LDH-0044",
    ownerName: "Harpreet Kaur",
    district: "Ludhiana",
    state: "Punjab",
    landUse: "Commercial",
    areaSqm: 1180,
    rorAreaSqm: 1180,
    surveyedAreaSqm: 1180,

    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    areaDiscrepancySqm: 0,

    registrationVerified: true,
    unbrokenChainOfTitle: true,
    lastMutationType: "Commercial Sale",
    lastMutationDate: "2019-01-20",

    // Active Mortgage (+15 risk)
    hasActiveMortgage: true,
    mortgageDetails: {
      lender: "State Bank of India (Focal Point SME Branch)",
      amount: 12000000,
      registeredDate: "2023-05-30",
      loanType: "Commercial Equipment & Hypothecation Charge",
      status: "active",
    },
    hasEncumbranceNotice: false,

    hasPendingDispute: false,

    zoningCompliant: true,
    masterPlanRestrictionDetected: false,
    permittedUses: ["Commercial Complex", "Retail Warehousing", "Corporate Office"],

    hasBuildingPermission: true,
    unapprovedLayoutDeviation: false,
    permissionDetails: "Municipal Building Permission Reg: PB-MC-2019-883",

    // Tax Paid (0 risk)
    taxPaid: true,
    taxArrearsAmount: 0,
    taxLastPaidDate: "2026-02-10",

    hasEnvironmentalRestriction: false,
    ecoBufferOverlapDetected: false,
    utilityBufferOverlap: false,
    satelliteAnomalyDetected: false,
  },

  // =========================================================================
  // 3. PB-LDH-0045: LOW RISK / CLEAN INDUSTRIAL TITLE (~12 / 100)
  // =========================================================================
  "PB-LDH-0045": {
    ulpid: "PB-LDH-0045",
    ownerName: "Amanjot Bros. Pvt. Ltd.",
    district: "Ludhiana",
    state: "Punjab",
    landUse: "Industrial",
    areaSqm: 4200,
    rorAreaSqm: 4200,
    surveyedAreaSqm: 4200,

    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    areaDiscrepancySqm: 0,

    registrationVerified: true,
    unbrokenChainOfTitle: true,
    lastMutationType: "Industrial Allotment",
    lastMutationDate: "2020-09-11",

    hasActiveMortgage: false,
    hasEncumbranceNotice: false,
    hasPendingDispute: false,

    zoningCompliant: true,
    masterPlanRestrictionDetected: false,
    permittedUses: ["Heavy Engineering", "Machinery Fabrication", "Green Category Industry"],

    hasBuildingPermission: true,
    unapprovedLayoutDeviation: false,
    permissionDetails: "PSIEC Industrial Sanction PSIEC/LDH/2020-410",

    taxPaid: true,
    taxArrearsAmount: 0,
    taxLastPaidDate: "2026-01-05",

    hasEnvironmentalRestriction: false,
    ecoBufferOverlapDetected: false,
    utilityBufferOverlap: false,
    satelliteAnomalyDetected: false,
  },

  // =========================================================================
  // 4. PB-LDH-0043: MODERATE RISK / BOUNDARY CONTENTION & TAX ARREARS (~52 / 100)
  // =========================================================================
  "PB-LDH-0043": {
    ulpid: "PB-LDH-0043",
    ownerName: "Suresh Singh",
    district: "Ludhiana",
    state: "Punjab",
    landUse: "Agricultural",
    areaSqm: 980,
    rorAreaSqm: 980,
    surveyedAreaSqm: 980,

    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    areaDiscrepancySqm: 0,

    registrationVerified: true,
    unbrokenChainOfTitle: false,
    registrationIrregularity: "Ancestral succession mutation audit note pending sub-divisional approval.",
    lastMutationType: "Inheritance",
    lastMutationDate: "2016-07-02",

    hasActiveMortgage: false,
    hasEncumbranceNotice: false,

    // Active boundary dispute (+15 risk)
    hasPendingDispute: true,
    disputeDetails: {
      caseNo: "REV/2026/410",
      court: "Sub-Divisional Revenue Officer Court, Ludhiana",
      filingDate: "2026-01-18",
      nature: "Adjacent Pathway Demarcation & Succession Challenge",
      status: "pending_trial",
    },

    zoningCompliant: true,
    masterPlanRestrictionDetected: false,

    hasBuildingPermission: true,
    unapprovedLayoutDeviation: false,

    // Tax Arrears (+5 risk)
    taxPaid: false,
    taxArrearsAmount: 3200,
    taxLastPaidDate: "2024-11-15",

    hasEnvironmentalRestriction: false,
    ecoBufferOverlapDetected: false,
    utilityBufferOverlap: false,

    // Satellite change (+5 risk)
    satelliteAnomalyDetected: true,
    satelliteChangeDetails: {
      changeType: "unauthorized_construction",
      confidenceScore: 0.94,
      detectedDate: "2026-09-02",
      affectedAreaSqm: 65,
    },
  },

  // =========================================================================
  // 5. CH-SEC-1701: LOW RISK / URBAN COMMERCIAL (~8 / 100)
  // =========================================================================
  "CH-SEC-1701": {
    ulpid: "CH-SEC-1701",
    ownerName: "Rajiv Walia & Associates",
    district: "Sector 17",
    state: "Chandigarh (UT)",
    landUse: "Commercial",
    areaSqm: 2400,
    rorAreaSqm: 2400,
    surveyedAreaSqm: 2400,

    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    areaDiscrepancySqm: 0,

    registrationVerified: true,
    unbrokenChainOfTitle: true,
    lastMutationType: "Allotment",
    lastMutationDate: "2015-08-19",

    hasActiveMortgage: false,
    hasEncumbranceNotice: false,
    hasPendingDispute: false,

    zoningCompliant: true,
    masterPlanRestrictionDetected: false,
    permittedUses: ["Commercial Banking", "Retail Showroom", "Consulting Offices"],

    hasBuildingPermission: true,
    unapprovedLayoutDeviation: false,
    permissionDetails: "UT Estate Office Sanction UT-EO-2015-110",

    taxPaid: true,
    taxArrearsAmount: 0,
    taxLastPaidDate: "2026-02-28",

    hasEnvironmentalRestriction: false,
    ecoBufferOverlapDetected: false,
    utilityBufferOverlap: false,
    satelliteAnomalyDetected: false,
  },

  // =========================================================================
  // 6. CH-SEC-1702: HIGH RISK / STATUTORY GREEN RESTRICTION ZONE (~82 / 100)
  // =========================================================================
  "CH-SEC-1702": {
    ulpid: "CH-SEC-1702",
    ownerName: "Chandigarh Urban Green Belt",
    district: "Sector 17",
    state: "Chandigarh (UT)",
    landUse: "Restriction Zone",
    areaSqm: 6800,
    rorAreaSqm: 6800,
    surveyedAreaSqm: 6800,

    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    areaDiscrepancySqm: 0,

    registrationVerified: true,
    unbrokenChainOfTitle: true,

    hasActiveMortgage: false,
    hasEncumbranceNotice: false,
    hasPendingDispute: false,

    // Statutory Restriction (+10 risk)
    zoningCompliant: false,
    masterPlanRestrictionDetected: true,
    zoningDetails:
      "Statutory Heritage Green Belt Corridor. Zero commercial or residential masonry construction permitted under Chandigarh Master Plan 2031.",
    permittedUses: ["Public Park / Botanical Preserve Only"],

    // Unauthorized Layout Deviation (+5 risk)
    hasBuildingPermission: false,
    unapprovedLayoutDeviation: true,
    permissionDetails: "Unauthorized paved parking expansion detected without Estate Office sanction.",

    taxPaid: true,
    taxArrearsAmount: 0,
    taxLastPaidDate: "2026-01-01",

    // Environmental Overlap (+10 risk)
    hasEnvironmentalRestriction: true,
    ecoBufferOverlapDetected: true,
    ecoZoneDetails: "Designated Sukhna Catchment Ecological Protection Zone.",

    utilityBufferOverlap: false,

    // Satellite Anomaly (+5 risk)
    satelliteAnomalyDetected: true,
    satelliteChangeDetails: {
      changeType: "unauthorized_construction",
      confidenceScore: 0.96,
      detectedDate: "2026-09-10",
      affectedAreaSqm: 110,
    },
  },

  // =========================================================================
  // 7. TN-SPR-0813: HIGH RISK / WETLAND CATCHMENT OVERLAP (~74 / 100)
  // =========================================================================
  "TN-SPR-0813": {
    ulpid: "TN-SPR-0813",
    ownerName: "Sriperumbudur Wetland Catchment",
    district: "Sriperumbudur (Kanchipuram)",
    state: "Tamil Nadu",
    landUse: "Eco-Sensitive",
    areaSqm: 14200,
    rorAreaSqm: 14200,
    surveyedAreaSqm: 14200,

    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    areaDiscrepancySqm: 0,

    registrationVerified: true,
    unbrokenChainOfTitle: true,

    hasActiveMortgage: false,
    hasEncumbranceNotice: false,
    hasPendingDispute: false,

    // Statutory restriction (+10 risk)
    zoningCompliant: false,
    masterPlanRestrictionDetected: true,
    zoningDetails: "Statutory waterbody catchment. Classified as prohibited poramboke / wetland buffer.",
    permittedUses: ["Water Retention & Eco Sanctuary"],

    hasBuildingPermission: false,
    unapprovedLayoutDeviation: true,

    taxPaid: true,
    taxArrearsAmount: 0,
    taxLastPaidDate: "2026-01-01",

    // Environmental Restriction (+10 risk)
    hasEnvironmentalRestriction: true,
    ecoBufferOverlapDetected: true,
    ecoZoneDetails: "Sriperumbudur Lake Inflow Channel Statutory No-Development Zone.",

    utilityBufferOverlap: true,
    utilityType: "stormwater_drain",
    utilityDetails: "Chembarambakkam Lake Surplus Flood Relief Corridor buffer overlap.",

    // Satellite Anomaly (+5 risk)
    satelliteAnomalyDetected: true,
    satelliteChangeDetails: {
      changeType: "waterbody_fill",
      confidenceScore: 0.92,
      detectedDate: "2026-09-08",
      affectedAreaSqm: 180,
    },
  },
};

/**
 * Evaluates and returns precomputed RiskAnalysis for any ULPID using the deterministic engine.
 */
export function getParcelRiskAnalysis(ulpid: string): RiskAnalysis {
  const attrs = MOCK_PARCEL_RISK_ATTRIBUTES[ulpid] || {
    ulpid,
    ownerName: "Titleholder",
    district: "Administrative Circle",
    state: "India",
    landUse: "Residential",
    areaSqm: 1000,
    ownerMatchesRoR: true,
    khewatKhatauniVerified: true,
    registrationVerified: true,
    unbrokenChainOfTitle: true,
    hasActiveMortgage: false,
    hasEncumbranceNotice: false,
    hasPendingDispute: false,
    zoningCompliant: true,
    masterPlanRestrictionDetected: false,
    hasBuildingPermission: true,
    unapprovedLayoutDeviation: false,
    taxPaid: true,
    taxArrearsAmount: 0,
    hasEnvironmentalRestriction: false,
    ecoBufferOverlapDetected: false,
    utilityBufferOverlap: false,
    satelliteAnomalyDetected: false,
  };

  return calculateParcelRisk(attrs);
}

/**
 * Returns all mock parcel risk analyses.
 */
export function getAllParcelRiskAnalyses(): RiskAnalysis[] {
  return Object.keys(MOCK_PARCEL_RISK_ATTRIBUTES).map((ulpid) =>
    getParcelRiskAnalysis(ulpid)
  );
}
