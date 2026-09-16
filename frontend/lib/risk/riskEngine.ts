import {
  ParcelRiskAttributes,
  RiskAnalysis,
  RiskFactor,
  RiskDriver,
  RiskRecommendation,
  RiskLevel,
  DataConfidenceItem,
  RiskHistory,
} from "./riskTypes";
import { RISK_SCORE_THRESHOLDS, STATUTORY_DISCLAIMER } from "./riskRules";

/**
 * Deterministic calculation engine for Parcel Due-Diligence & Risk Scoring.
 * Calculates transparent, explainable 0–100 risk score and drivers.
 */
export function calculateParcelRisk(attrs: ParcelRiskAttributes): RiskAnalysis {
  const factors: RiskFactor[] = [];
  const drivers: RiskDriver[] = [];
  const recommendations: RiskRecommendation[] = [];
  let totalPoints = 0;

  // 1. Ownership Consistency (Max: 15)
  if (!attrs.ownerMatchesRoR) {
    const pts = 15;
    totalPoints += pts;
    factors.push({
      category: "ownership",
      categoryLabel: "Ownership Consistency",
      status: "Ownership Record Inconsistency Flagged",
      severity: "high",
      pointsContribution: pts,
      maxCategoryWeight: 15,
      explanation:
        attrs.ownershipMismatchReason ||
        "Titleholder name in deed does not strictly match the current Jamabandi / RoR register.",
      dataSource: "Simulated Record (Revenue Circle)",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: false,
    });
    drivers.push({
      category: "ownership",
      label: "Ownership Mismatch",
      points: pts,
      percentage: pts,
      severity: "high",
      summary: "Revenue record titleholder differs from deed record.",
    });
    recommendations.push({
      id: "rec-ownership-1",
      category: "ownership",
      title: "Verify Titleholder Continuity",
      actionText: "Request certified Jamabandi extract and verify registered succession/transfer trail.",
      priority: "high",
      authorityToVerify: "Tahsildar / Sub-Divisional Magistrate (Revenue)",
      documentationRequired: "Latest Certified Copy of Jamabandi / Patta Chitta",
    });
  } else {
    factors.push({
      category: "ownership",
      categoryLabel: "Ownership Consistency",
      status: "Owner matches RoR Record",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 15,
      explanation: "Current declared titleholder matches the official Record of Rights without discrepancy.",
      dataSource: "Demo Registry Data",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: true,
    });
  }

  // 2. Record of Rights (RoR) & Cadastral Area Consistency (Max: 10)
  const rorArea = attrs.rorAreaSqm || attrs.areaSqm;
  const surveyedArea = attrs.surveyedAreaSqm || attrs.areaSqm;
  const areaDiff = Math.abs(rorArea - surveyedArea);
  const hasAreaMismatch = areaDiff > 10;

  if (hasAreaMismatch || !attrs.khewatKhatauniVerified) {
    const pts = hasAreaMismatch && areaDiff > 50 ? 10 : 6;
    totalPoints += pts;
    factors.push({
      category: "ror",
      categoryLabel: "Record of Rights (RoR)",
      status: `Area Variance Detected (${areaDiff} sqm difference)`,
      severity: pts === 10 ? "high" : "medium",
      pointsContribution: pts,
      maxCategoryWeight: 10,
      explanation: `RoR extent (${rorArea.toLocaleString()} sqm) diverges from GIS cadastral polygon extent (${surveyedArea.toLocaleString()} sqm).`,
      dataSource: "PostGIS Spatial Cadastre & Jamabandi",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: false,
      metadata: { rorArea, surveyedArea, areaDiff },
    });
    drivers.push({
      category: "ror",
      label: "RoR / Survey Area Variance",
      points: pts,
      percentage: pts,
      severity: "medium",
      summary: `${areaDiff} sqm discrepancy between revenue book and physical GIS boundary.`,
    });
    recommendations.push({
      id: "rec-ror-1",
      category: "ror",
      title: "Conduct Spatial Cadastral Resurvey",
      actionText: "Verify boundary demarkation on the ground with revenue patwari/kanungo.",
      priority: "medium",
      authorityToVerify: "Directorate of Land Records & Survey",
      documentationRequired: "Field Tatima / Cadastral Boundary Map",
    });
  } else {
    factors.push({
      category: "ror",
      categoryLabel: "Record of Rights (RoR)",
      status: "RoR & Survey Extents Reconciled",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 10,
      explanation: "Cadastral survey boundary perfectly matches recorded Khewat/Khatauni area.",
      dataSource: "PostGIS Spatial Engine (EPSG:4326)",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: true,
    });
  }

  // 3. Registration History & Title Chain (Max: 10)
  if (!attrs.registrationVerified || !attrs.unbrokenChainOfTitle) {
    const pts = 10;
    totalPoints += pts;
    factors.push({
      category: "registration",
      categoryLabel: "Registration History",
      status: "Historical Mutation Irregularity Flagged",
      severity: "medium",
      pointsContribution: pts,
      maxCategoryWeight: 10,
      explanation:
        attrs.registrationIrregularity ||
        "Prior conveyance deed requires verification against the central sub-registrar volume register.",
      dataSource: "Simulated e-Panchayat / SRO Record",
      confidence: "medium",
      confidenceText: "Available / Medium Confidence",
      isCompliant: false,
    });
    drivers.push({
      category: "registration",
      label: "Registration Irregularity",
      points: pts,
      percentage: pts,
      severity: "medium",
      summary: "Prior mutation audit chain has gaps requiring verification.",
    });
    recommendations.push({
      id: "rec-reg-1",
      category: "registration",
      title: "Inspect Encumbrance & Mutation Records",
      actionText: "Obtain 30-year Encumbrance Certificate (EC) from the Sub-Registrar Office.",
      priority: "medium",
      authorityToVerify: "Sub-Registrar Office (e-Governance Portal)",
      documentationRequired: "30-Year Non-Encumbrance Certificate (Form 15/16)",
    });
  } else {
    factors.push({
      category: "registration",
      categoryLabel: "Registration History",
      status: "Registration History Verified",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 10,
      explanation: "Mutation sequence is unbroken, stamped, and recorded in the sub-registrar volume index.",
      dataSource: "Demo Registry Data",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: true,
    });
  }

  // 4. Mortgage & Encumbrance Status (Max: 15)
  if (attrs.hasActiveMortgage || attrs.hasEncumbranceNotice) {
    const pts = 15;
    totalPoints += pts;
    const lender = attrs.mortgageDetails?.lender || "Scheduled Commercial Bank";
    factors.push({
      category: "mortgage",
      categoryLabel: "Mortgage / Encumbrance",
      status: `Active Mortgage Registered (${lender})`,
      severity: "high",
      pointsContribution: pts,
      maxCategoryWeight: 15,
      explanation: `An active financial charge or statutory mortgage is registered on this parcel with ${lender}. Prior loan discharge / NOC is required before transfer.`,
      dataSource: "CERSAI / SRO Charge Register (Demo)",
      confidence: "medium",
      confidenceText: "Available / Medium Confidence",
      isCompliant: false,
      metadata: attrs.mortgageDetails || {},
    });
    drivers.push({
      category: "mortgage",
      label: "Active Mortgage / Charge",
      points: pts,
      percentage: pts,
      severity: "high",
      summary: `Registered financial charge with ${lender}.`,
    });
    recommendations.push({
      id: "rec-mortgage-1",
      category: "mortgage",
      title: "Verify Mortgage & Obtain Bank NOC",
      actionText: `Verify outstanding balance and obtain official No Objection Certificate / Deed of Reconveyance from ${lender}.`,
      priority: "high",
      authorityToVerify: "Sub-Registrar Office / Lending Institution",
      documentationRequired: "Bank Loan Closure Certificate & Registered Reconveyance Deed",
    });
  } else {
    factors.push({
      category: "mortgage",
      categoryLabel: "Mortgage / Encumbrance",
      status: "No Active Mortgages / Liens Detected",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 15,
      explanation: "No registered financial encumbrance, court attachment, or banking lien found on title.",
      dataSource: "Demo Registry Data",
      confidence: "medium",
      confidenceText: "Available / Medium Confidence",
      isCompliant: true,
    });
  }

  // 5. Dispute & Litigation Status (Max: 15)
  if (attrs.hasPendingDispute) {
    const pts = 15;
    totalPoints += pts;
    const court = attrs.disputeDetails?.court || "Civil Court (Sub-Division)";
    const nature = attrs.disputeDetails?.nature || "Title / Boundary Partition Suit";
    factors.push({
      category: "dispute",
      categoryLabel: "Dispute Status",
      status: `Pending Civil Dispute (${court})`,
      severity: "critical",
      pointsContribution: pts,
      maxCategoryWeight: 15,
      explanation: `Pending litigation recorded: ${nature} in ${court}. Property subject to lis pendens / judicial review.`,
      dataSource: "e-Courts Registry (Simulated Record)",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: false,
      metadata: attrs.disputeDetails || {},
    });
    drivers.push({
      category: "dispute",
      label: "Pending Civil Dispute",
      points: pts,
      percentage: pts,
      severity: "critical",
      summary: `Active court case in ${court} (${nature}).`,
    });
    recommendations.push({
      id: "rec-dispute-1",
      category: "dispute",
      title: "Review Court Case & Injunction Orders",
      actionText: "Examine case proceedings and interim stay orders in the competent civil or revenue court.",
      priority: "high",
      authorityToVerify: "District & Sessions Court / Revenue Appellate Authority",
      documentationRequired: "Certified Copy of Plaint, Written Statement & Order Sheets",
    });
  } else {
    factors.push({
      category: "dispute",
      categoryLabel: "Dispute Status",
      status: "No Pending Disputes / Litigation Found",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 15,
      explanation: "No pending civil suit, lis pendens notice, or revenue court dispute linked to ULPID.",
      dataSource: "Demo e-Courts Dataset",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: true,
    });
  }

  // 6. Zoning & Land-Use Compliance (Max: 10)
  if (!attrs.zoningCompliant || attrs.masterPlanRestrictionDetected) {
    const pts = 10;
    totalPoints += pts;
    factors.push({
      category: "zoning",
      categoryLabel: "Zoning / Land-Use Compliance",
      status: "Zoning / Master Plan Restriction Detected",
      severity: "high",
      pointsContribution: pts,
      maxCategoryWeight: 10,
      explanation:
        attrs.zoningDetails ||
        "Designated master plan land use imposes construction restrictions or conversion approvals are pending.",
      dataSource: "Town & Country Planning Master Plan 2031",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: false,
    });
    drivers.push({
      category: "zoning",
      label: "Zoning Restriction",
      points: pts,
      percentage: pts,
      severity: "high",
      summary: "Permitted land use does not permit unrestricted commercial/residential development.",
    });
    recommendations.push({
      id: "rec-zoning-1",
      category: "zoning",
      title: "Confirm Permitted Use with Planning Authority",
      actionText: "Verify Change of Land Use (CLU) clearance and zoning certificate from Town Planning.",
      priority: "medium",
      authorityToVerify: "Town & Country Planning / Urban Development Authority",
      documentationRequired: "Statutory Zoning Certificate & CLU Sanction Order",
    });
  } else {
    factors.push({
      category: "zoning",
      categoryLabel: "Zoning / Land-Use Compliance",
      status: "Zoning & Master Plan Compliant",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 10,
      explanation: `Land use (${attrs.landUse}) complies fully with statutory Master Plan zoning regulations.`,
      dataSource: "Town Planning Master Plan 2031",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: true,
    });
  }

  // 7. Building Permission & Layout Sanction (Max: 5)
  if (!attrs.hasBuildingPermission || attrs.unapprovedLayoutDeviation) {
    const pts = 5;
    totalPoints += pts;
    factors.push({
      category: "building_permission",
      categoryLabel: "Building Permissions",
      status: "Building Permission Pending / Unsanctioned Deviation",
      severity: "low",
      pointsContribution: pts,
      maxCategoryWeight: 5,
      explanation:
        attrs.permissionDetails ||
        "Municipal building layout sanction or occupancy certificate has not been registered in public records.",
      dataSource: "Municipal Corporation Portal (Simulated)",
      confidence: "medium",
      confidenceText: "Simulated Record / Prototype",
      isCompliant: false,
    });
    drivers.push({
      category: "building_permission",
      label: "Building Sanction Pending",
      points: pts,
      percentage: pts,
      severity: "low",
      summary: "Municipal building permission record not available in digital registry.",
    });
    recommendations.push({
      id: "rec-building-1",
      category: "building_permission",
      title: "Verify Sanctioned Building Plan",
      actionText: "Confirm sanctioned architectural layout and occupancy certificate with the local municipality.",
      priority: "advisory",
      authorityToVerify: "Municipal Corporation / Town Planning Dept",
      documentationRequired: "Sanctioned Building Plan & Occupancy Certificate",
    });
  } else {
    factors.push({
      category: "building_permission",
      categoryLabel: "Building Permissions",
      status: "Sanctioned Building Permission Available",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 5,
      explanation: "Approved layout and building sanction are registered with municipal authorities.",
      dataSource: "Municipal Corporation Portal (Simulated)",
      confidence: "medium",
      confidenceText: "Simulated Record / Prototype",
      isCompliant: true,
    });
  }

  // 8. Property Tax Status (Max: 5)
  if (!attrs.taxPaid || attrs.taxArrearsAmount > 0) {
    const pts = 5;
    totalPoints += pts;
    factors.push({
      category: "property_tax",
      categoryLabel: "Property Tax Status",
      status: `Outstanding Tax Dues: ₹${attrs.taxArrearsAmount.toLocaleString()}`,
      severity: "low",
      pointsContribution: pts,
      maxCategoryWeight: 5,
      explanation: `Municipal property tax has outstanding arrears of ₹${attrs.taxArrearsAmount.toLocaleString()}. Tax clearance certificate required before deed execution.`,
      dataSource: "Municipal Assessment Register (Demo)",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: false,
      metadata: { dues: attrs.taxArrearsAmount },
    });
    drivers.push({
      category: "property_tax",
      label: "Property Tax Arrears",
      points: pts,
      percentage: pts,
      severity: "low",
      summary: `Pending municipal tax arrears of ₹${attrs.taxArrearsAmount.toLocaleString()}.`,
    });
    recommendations.push({
      id: "rec-tax-1",
      category: "property_tax",
      title: "Clear Municipal Property Tax Dues",
      actionText: "Settle outstanding municipal property tax assessment and obtain No-Dues Receipt.",
      priority: "advisory",
      authorityToVerify: "Municipal Corporation Revenue Branch",
      documentationRequired: "Latest Property Tax Assessment & No-Dues Receipt",
    });
  } else {
    factors.push({
      category: "property_tax",
      categoryLabel: "Property Tax Status",
      status: "Property Tax Fully Paid (Zero Dues)",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 5,
      explanation: "All municipal property tax assessments are up to date with zero outstanding dues.",
      dataSource: "Municipal Assessment Register (Demo)",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: true,
    });
  }

  // 9. Environmental & Eco-Sensitive Overlap (Max: 10)
  if (attrs.hasEnvironmentalRestriction || attrs.ecoBufferOverlapDetected) {
    const pts = 10;
    totalPoints += pts;
    factors.push({
      category: "environmental",
      categoryLabel: "Environmental Restrictions",
      status: "Protected / Eco-Sensitive Zone Overlap Detected",
      severity: "high",
      pointsContribution: pts,
      maxCategoryWeight: 10,
      explanation:
        attrs.ecoZoneDetails ||
        "Parcel overlaps with designated wetland catchment, statutory green restriction zone, or forest buffer.",
      dataSource: "State Forest & Wetlands Spatial Layer (Prototype)",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: false,
    });
    drivers.push({
      category: "environmental",
      label: "Eco-Sensitive Zone Overlap",
      points: pts,
      percentage: pts,
      severity: "high",
      summary: "Parcel lies inside or adjoins statutory green corridor/wetland buffer.",
    });
    recommendations.push({
      id: "rec-env-1",
      category: "environmental",
      title: "Obtain Environmental / Wetland Clearance",
      actionText: "Verify statutory boundary setback requirements with Forest/Environmental regulatory bodies.",
      priority: "high",
      authorityToVerify: "State Wetland Authority / Forest Department",
      documentationRequired: "Environmental Non-Involvement / NOC Certificate",
    });
  } else {
    factors.push({
      category: "environmental",
      categoryLabel: "Environmental Restrictions",
      status: "No Protected-Zone Overlap Detected",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 10,
      explanation: "No conflict with eco-sensitive sanctuaries, riverbeds, forest reservations, or waterbodies.",
      dataSource: "State Forest & Wetlands Spatial Layer (Prototype)",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      isCompliant: true,
    });
  }

  // 10. Satellite Change & Temporal Anomaly Detection (Max: 5)
  if (attrs.satelliteAnomalyDetected) {
    const pts = 5;
    totalPoints += pts;
    const changeDesc = attrs.satelliteChangeDetails?.changeType?.replace("_", " ") || "physical alteration";
    const area = attrs.satelliteChangeDetails?.affectedAreaSqm || 65;
    factors.push({
      category: "satellite_change",
      categoryLabel: "Satellite Change Indicators",
      status: `Possible Recent Change Detected (${changeDesc})`,
      severity: "medium",
      pointsContribution: pts,
      maxCategoryWeight: 5,
      explanation: `Multi-temporal satellite earth observation flagged ~${area} sqm physical anomaly (${changeDesc}) requiring ground verification.`,
      dataSource: "Automated Satellite Change Detection (Stage 4 Prototype)",
      confidence: "medium",
      confidenceText: "Detected / Medium Confidence",
      isCompliant: false,
      metadata: attrs.satelliteChangeDetails || {},
    });
    drivers.push({
      category: "satellite_change",
      label: "Satellite Anomaly",
      points: pts,
      percentage: pts,
      severity: "medium",
      summary: `Earth observation flagged ~${area} sqm recent physical alteration.`,
    });
    recommendations.push({
      id: "rec-sat-1",
      category: "satellite_change",
      title: "Conduct Ground Field Verification",
      actionText: "Depute revenue surveyor to physically inspect flagged satellite anomaly and confirm site status.",
      priority: "medium",
      authorityToVerify: "Revenue Field Staff (Patwari / Kanungo)",
      documentationRequired: "Ground Inspection Field Report & Geo-tagged Photographs",
    });
  } else {
    factors.push({
      category: "satellite_change",
      categoryLabel: "Satellite Change Indicators",
      status: "No Detected Satellite Anomalies",
      severity: "none",
      pointsContribution: 0,
      maxCategoryWeight: 5,
      explanation: "Multi-temporal satellite optical & radar imagery shows no unpermitted structural changes.",
      dataSource: "Automated Satellite Change Detection (Stage 4 Prototype)",
      confidence: "medium",
      confidenceText: "Detected / Medium Confidence",
      isCompliant: true,
    });
  }

  // Ensure overall score is bounded between 0 and 100
  const finalScore = Math.min(100, Math.max(0, totalPoints));

  // Determine Risk Level
  let level: RiskLevel = "LOW";
  if (finalScore >= RISK_SCORE_THRESHOLDS.HIGH_MIN) {
    level = "HIGH";
  } else if (finalScore > RISK_SCORE_THRESHOLDS.LOW_MAX) {
    level = "MODERATE";
  }

  // Sort drivers by points descending
  drivers.sort((a, b) => b.points - a.points);

  // Synthesize Explainable Natural Language AI Assessment Summary
  const summaryText = generateAiAssessmentSummary(attrs, finalScore, level, drivers);

  // Generate Data Confidence Items
  const dataConfidence: DataConfidenceItem[] = [
    {
      category: "ownership",
      label: "Ownership & Jamabandi",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      sourceLabel: "State Directorate of Land Records",
      isAuthoritative: true,
    },
    {
      category: "ror",
      label: "Cadastral Boundary Extent",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      sourceLabel: "PostGIS Spatial Engine (EPSG:4326)",
      isAuthoritative: true,
    },
    {
      category: "mortgage",
      label: "Mortgages & Banking Charges",
      confidence: "medium",
      confidenceText: "Available / Medium Confidence",
      sourceLabel: "CERSAI / Sub-Registrar Encumbrance Register (Demo)",
      isAuthoritative: false,
    },
    {
      category: "dispute",
      label: "Court Dispute Tracking",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      sourceLabel: "e-Courts National Portal (Simulated)",
      isAuthoritative: false,
    },
    {
      category: "zoning",
      label: "Master Plan Statutory Zoning",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      sourceLabel: "Town & Country Planning Master Plan 2031",
      isAuthoritative: true,
    },
    {
      category: "environmental",
      label: "Environmental / Wetland Buffer",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      sourceLabel: "State Wetlands & Forest Layer (Prototype)",
      isAuthoritative: true,
    },
    {
      category: "property_tax",
      label: "Municipal Property Tax",
      confidence: "high",
      confidenceText: "Verified / High Confidence",
      sourceLabel: "Municipal Corporation Assessment Record",
      isAuthoritative: true,
    },
    {
      category: "satellite_change",
      label: "Satellite Change & SAR Analysis",
      confidence: "medium",
      confidenceText: "Detected / Medium Confidence",
      sourceLabel: "Automated Earth Observation Engine (Stage 4 Prototype)",
      isAuthoritative: false,
    },
  ];

  // Derive historical trend points for multi-year monitoring
  const history: RiskHistory = generateRiskHistory(attrs, finalScore, level);

  return {
    ulpid: attrs.ulpid,
    ownerName: attrs.ownerName,
    district: attrs.district,
    state: attrs.state,
    landUse: attrs.landUse,
    areaSqm: attrs.areaSqm,
    score: finalScore,
    level,
    totalIndicatorsEvaluated: 13,
    activeRiskFlagsCount: drivers.length,
    analysisTimestamp: "2026-09-16 11:00 UTC · Prototype Assessment",
    factors,
    topDrivers: drivers,
    recommendations,
    summaryText,
    disclaimer: STATUTORY_DISCLAIMER,
    dataConfidence,
    history,
  };
}

/**
 * Natural language deterministic template generation for AI Assessment Summary
 */
function generateAiAssessmentSummary(
  attrs: ParcelRiskAttributes,
  score: number,
  level: RiskLevel,
  drivers: RiskDriver[]
): string {
  if (level === "LOW") {
    return `This parcel presents a favorable risk profile (Score: ${score}/100) with verified titleholder consistency across revenue and registration registers. Property tax records reflect no outstanding dues, and no civil litigation, active banking encumbrances, or statutory zoning restrictions were detected.`;
  }

  if (level === "MODERATE") {
    const driverNames = drivers.map((d) => d.label.toLowerCase()).join(" and ");
    return `This parcel shows moderate elevated risk (Score: ${score}/100) primarily driven by ${driverNames || "isolated procedural variances"}. While core ownership records are verified, verification of the flagged conditions with the relevant departmental authorities is advised prior to formal deed execution or loan sanction.`;
  }

  // HIGH RISK
  const topDriversText = drivers
    .slice(0, 3)
    .map((d) => d.label.toLowerCase())
    .join(", ");
  return `This parcel shows elevated high risk (Score: ${score}/100) primarily due to ${topDriversText || "multiple compounding risk factors"}. Immediate due diligence, including formal verification of litigation records, mortgage discharge certificates, and physical cadastral boundary alignment, is strongly recommended before proceeding with transactions or administrative approvals.`;
}

/**
 * Historical Risk Data generator demonstrating multi-year monitoring capability
 */
function generateRiskHistory(
  attrs: ParcelRiskAttributes,
  currentScore: number,
  level: RiskLevel
): RiskHistory {
  if (attrs.ulpid === "PB-LDH-0042") {
    return {
      previousScore: 42,
      currentScore: 78,
      delta: 36,
      deltaReason: "Civil dispute objection filed and active bank mortgage registered in latest revenue cycle.",
      timeline: [
        { year: 2024, score: 28, level: "LOW", primaryEvent: "Standard residential titling recorded" },
        { year: 2025, score: 42, level: "MODERATE", primaryEvent: "Area variance detected during digital resurvey" },
        { year: 2026, score: 78, level: "HIGH", primaryEvent: "Active civil litigation & bank mortgage flagged" },
      ],
    };
  }

  if (level === "HIGH") {
    return {
      previousScore: Math.max(30, currentScore - 25),
      currentScore,
      delta: 25,
      deltaReason: "New statutory restrictions and spatial boundary flags identified in recent audit.",
      timeline: [
        { year: 2024, score: 32, level: "MODERATE", primaryEvent: "Initial digital baseline assessment" },
        { year: 2025, score: 55, level: "MODERATE", primaryEvent: "Satellite change anomaly flagged" },
        { year: 2026, score: currentScore, level: "HIGH", primaryEvent: "Multi-factor statutory alerts active" },
      ],
    };
  }

  if (level === "MODERATE") {
    return {
      previousScore: Math.max(10, currentScore - 15),
      currentScore,
      delta: 15,
      deltaReason: "Recent financial charge or municipal assessment variance updated in register.",
      timeline: [
        { year: 2024, score: 18, level: "LOW", primaryEvent: "Baseline title clear" },
        { year: 2025, score: 26, level: "LOW", primaryEvent: "Annual assessment logged" },
        { year: 2026, score: currentScore, level: "MODERATE", primaryEvent: "Active financial charge / dues flagged" },
      ],
    };
  }

  return {
    previousScore: Math.max(5, currentScore - 4),
    currentScore,
    delta: 0,
    deltaReason: "Consistent clean title and statutory compliance maintained across monitoring cycles.",
    timeline: [
      { year: 2024, score: 14, level: "LOW", primaryEvent: "Cadastral survey georeferenced" },
      { year: 2025, score: 10, level: "LOW", primaryEvent: "Annual municipal tax cleared" },
      { year: 2026, score: currentScore, level: "LOW", primaryEvent: "All statutory checks verified clear" },
    ],
  };
}
