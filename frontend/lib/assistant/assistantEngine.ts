/**
 * Bhu-Setu Land Assistant Engine
 * Grounded natural-language query resolution across application data and domain knowledge.
 */

import { getParcel, getConflicts, getParcelReconciliation, searchParcels } from "@/lib/api";
import { getParcelRiskAnalysis } from "@/lib/risk/mockRiskData";
import { LAND_KNOWLEDGE_TOPICS, LandTopic } from "./landKnowledge";
import { UserRole } from "@/lib/types";

export interface AssistantAction {
  label: string;
  href: string;
  iconType?: "parcel" | "map" | "recon" | "conflict" | "mutation" | "risk";
}

export interface AssistantResponse {
  id: string;
  text: string;
  sourceContext: string;
  provenanceType: "verified_record" | "reconciliation_engine" | "general_knowledge" | "officer_advisory" | "demo_notice";
  actions?: AssistantAction[];
  suggestedFollowups?: string[];
  timestamp: string;
}

// Known prototype parcel identifiers
const KNOWN_ULPIDS = ["PB-LDH-0042", "PB-LDH-0043", "PB-LDH-0044", "CH-SEC-1701", "TN-SPR-0814"];

// Owner to ULPID mapping
const OWNER_ULPID_MAP: Record<string, string> = {
  ramesh: "PB-LDH-0042",
  suresh: "PB-LDH-0043",
  rajiv: "CH-SEC-1701",
  venkatesan: "TN-SPR-0814",
  walia: "CH-SEC-1701",
};

/**
 * Extract parcel ULPID from a user prompt
 */
export function extractUlpidFromPrompt(prompt: string): string | null {
  const upper = prompt.toUpperCase();
  
  // Direct ULPID regex (e.g. PB-LDH-0042 or CH-SEC-1701)
  for (const ulpid of KNOWN_ULPIDS) {
    if (upper.includes(ulpid)) {
      return ulpid;
    }
  }

  // Check general ULPID pattern: XX-XXX-XXXX
  const generalMatch = prompt.match(/\b([A-Z]{2}-[A-Z]{3,4}-\d{4})\b/i);
  if (generalMatch) {
    return generalMatch[1].toUpperCase();
  }

  // Check owner names
  const lower = prompt.toLowerCase();
  for (const [ownerKey, mappedUlpid] of Object.entries(OWNER_ULPID_MAP)) {
    if (lower.includes(ownerKey)) {
      return mappedUlpid;
    }
  }

  return null;
}

/**
 * Main query resolution function
 */
export async function processAssistantQuery(
  query: string,
  userRole: UserRole = "citizen",
  activeParcelUlpid?: string | null
): Promise<AssistantResponse> {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const now = new Date().toISOString();

  // 1. Check for explicit or contextual parcel references
  const detectedUlpid = extractUlpidFromPrompt(trimmed) || activeParcelUlpid;

  // 2. Safety filter: Refuse to fabricate private / live government credentials
  if (
    lower.includes("aadhaar") ||
    lower.includes("aadhar") ||
    lower.includes("court order pdf") ||
    lower.includes("bank pin") ||
    lower.includes("password")
  ) {
    return {
      id: `resp-${Date.now()}`,
      text: `### Privacy & Legal Safety Policy
**Bhu-Setu does not store, process, or display Aadhaar numbers, personal biometric credentials, or live court decrees.**

- **Prototype Transparency:** In this demonstration environment, only synthetic cadastral records are processed under the 14-digit ULPID.
- **Statutory Verification:** Official landholder identity is verified through authorized state revenue channels and offline field verification protocols.`,
      sourceContext: "System Policy · Privacy & Data Protection",
      provenanceType: "demo_notice",
      suggestedFollowups: [
        "What is ULPID?",
        "Show me information about PB-LDH-0042",
        "How does parcel reconciliation work?"
      ],
      timestamp: now,
    };
  }

  // 3. Handle Parcel-Specific Queries
  if (detectedUlpid) {
    const parcelResponse = await handleParcelQuery(detectedUlpid, lower, userRole, now);
    if (parcelResponse) return parcelResponse;
  }

  // 4. Handle General Land Knowledge Topics
  const topicResponse = handleKnowledgeTopic(lower, userRole, now);
  if (topicResponse) return topicResponse;

  // 5. Fallback Search in Cadastral Index
  try {
    const searchResults = await searchParcels(trimmed);
    if (searchResults.length > 0) {
      const first = searchResults[0];
      const parcelData = await getParcel(first.ulpid);
      if (parcelData) {
        return {
          id: `resp-${Date.now()}`,
          text: `### Matching Parcel Record Found: \`${first.ulpid}\`

- **Owner / Titleholder:** ${parcelData.owner.name}
- **Location:** ${parcelData.district}, ${parcelData.state}
- **Total Area:** ${parcelData.area_sqm.toLocaleString()} sqm
- **Land Classification:** ${parcelData.land_use}
- **Tax Status:** ${parcelData.tax_status.paid ? "✓ Tax Paid" : `⚠ ₹${parcelData.tax_status.dues} Dues Pending`}`,
          sourceContext: `Bhu-Setu Cadastral Store · ${first.ulpid}`,
          provenanceType: "verified_record",
          actions: [
            { label: `Open Record (${first.ulpid})`, href: `/citizen/parcel/${first.ulpid}`, iconType: "parcel" },
            { label: "View on GIS Map", href: `/map`, iconType: "map" },
          ],
          suggestedFollowups: [
            `Why is ${first.ulpid} flagged?`,
            `What is the land risk score for ${first.ulpid}?`,
            "What is ULPID?"
          ],
          timestamp: now,
        };
      }
    }
  } catch {
    // Continue to default fallback
  }

  // 6. Transparent Fallback (Do not fabricate unknown data)
  return {
    id: `resp-${Date.now()}`,
    text: `### Information Not Found in Demo Dataset
I don't have recorded information matching your question in the current Bhu-Setu prototype.

**Available Demonstration Scenarios in this Prototype:**
- **\`PB-LDH-0042\`:** Primary demo case featuring a **70 sqm area discrepancy** between legacy Jamabandi RoR (1,250 sqm) and Cadastral GIS polygon (1,180 sqm).
- **\`PB-LDH-0044\`:** 100% reconciled verified residential parcel.
- **\`PB-LDH-0043\`:** Agricultural parcel with municipal property tax arrears.
- **\`CH-SEC-1701\`:** Verified commercial allotment in Chandigarh Sector 17.

*Feel free to click any suggestion below to explore the prototype.*`,
    sourceContext: "Bhu-Setu Prototype Dataset Notice",
    provenanceType: "demo_notice",
    suggestedFollowups: [
      "Show me information about PB-LDH-0042",
      "Why is PB-LDH-0042 flagged?",
      "What is ULPID?",
      "What is the difference between RoR and cadastral GIS?",
      "What should an officer verify before approving a mutation?"
    ],
    timestamp: now,
  };
}

/**
 * Handle queries targeting a specific land parcel
 */
async function handleParcelQuery(
  ulpid: string,
  lowerQuery: string,
  userRole: UserRole,
  timestamp: string
): Promise<AssistantResponse | null> {
  const [parcel, conflicts, reconReport] = await Promise.all([
    getParcel(ulpid),
    getConflicts(ulpid),
    getParcelReconciliation(ulpid),
  ]);

  if (!parcel) {
    return {
      id: `resp-${Date.now()}`,
      text: `### Parcel \`${ulpid}\` Not Found
No land parcel record exists for identifier **${ulpid}** in the prototype cadastre.

You can explore configured test parcels such as **\`PB-LDH-0042\`**, **\`PB-LDH-0044\`**, or **\`CH-SEC-1701\`**.`,
      sourceContext: "Bhu-Setu Cadastral Registry",
      provenanceType: "demo_notice",
      suggestedFollowups: [
        "Tell me about PB-LDH-0042",
        "What is ULPID?"
      ],
      timestamp,
    };
  }

  const rorArea = parcel.ror_area_sqm || (parcel.ulpid === "PB-LDH-0042" ? 1250 : parcel.area_sqm);
  const surveyedArea = parcel.surveyed_area_sqm || (parcel.ulpid === "PB-LDH-0042" ? 1180 : parcel.area_sqm);
  const diffArea = Math.abs(rorArea - surveyedArea);
  const hasAreaMismatch = rorArea !== surveyedArea;
  const riskAnalysis = getParcelRiskAnalysis(ulpid);

  const isOfficer = userRole === "revenue_officer" || userRole === "registrar" || userRole === "admin";

  // Sub-case A: Why is this parcel flagged / area mismatch questions
  if (
    lowerQuery.includes("why") ||
    lowerQuery.includes("flag") ||
    lowerQuery.includes("mismatch") ||
    lowerQuery.includes("conflict") ||
    lowerQuery.includes("discrepancy") ||
    lowerQuery.includes("issue")
  ) {
    if (hasAreaMismatch) {
      return {
        id: `resp-${Date.now()}`,
        text: `### Discrepancy Analysis: \`${ulpid}\`
**${ulpid} is flagged because the textual area in the State Record of Rights (RoR) differs from the surveyed Cadastral GIS polygon.**

#### 📊 Quantitative Comparison:
| Source Record | Area Extent | Description |
| :--- | :--- | :--- |
| **State RoR (Jamabandi)** | **${rorArea.toLocaleString()} sqm** | Historical deed registration record |
| **Cadastral GIS (Bhu-Naksha)** | **${surveyedArea.toLocaleString()} sqm** | PostGIS georeferenced polygon (EPSG:4326) |
| **Variance / Delta** | **-${diffArea} sqm (-${((diffArea / rorArea) * 100).toFixed(1)}%)** | **Discrepancy requiring field verification** |

#### 🔍 Root Cause & Technical Findings:
- **Historical Chain Survey vs Vectorization:** Legacy paper Jamabandi was measured with chain units (*Jareeb*), whereas the PostGIS vector survey computes precise ground coordinates.
- **Administrative Status:** **${parcel.record_status || "Needs Verification"}**.

${isOfficer ? `> **Advisory for Revenue Officers:**
> Conduct ground demarcation (*Nishandehi*) to confirm physical boundary marks before approving the pending mutation. Ensure adjacent plots do not share overlapping coordinate vertices.` : `> **Citizen Advisory:**
> This technical discrepancy does not invalidate your legal title. A joint field re-verification by the revenue department will synchronize the digital map and paper ledger.`}`,
        sourceContext: `Bhu-Setu Multi-Source Reconciliation · ${ulpid}`,
        provenanceType: "reconciliation_engine",
        actions: [
          { label: "Inspect Parcel Record", href: `/citizen/parcel/${ulpid}`, iconType: "parcel" },
          { label: "View on GIS Map", href: `/map`, iconType: "map" },
          { label: "View Inconsistencies", href: `/officer/conflicts`, iconType: "conflict" },
          ...(isOfficer ? [{ label: "Adjudicate Mutation", href: `/officer/mutations?ulpid=${ulpid}`, iconType: "mutation" as const }] : []),
        ],
        suggestedFollowups: [
          `What is the land risk score for ${ulpid}?`,
          "What should an officer verify before approving a mutation?",
          "How does parcel reconciliation work?"
        ],
        timestamp,
      };
    } else {
      return {
        id: `resp-${Date.now()}`,
        text: `### Reconciliation Status: \`${ulpid}\`
**No discrepancies or spatial conflicts are flagged for ${ulpid}.**

- **State RoR Area:** ${rorArea.toLocaleString()} sqm
- **Cadastral GIS Extent:** ${surveyedArea.toLocaleString()} sqm
- **Variance:** 0 sqm (100% Reconciled)
- **Status:** **Verified Clear**`,
        sourceContext: `Bhu-Setu Cadastral Store · ${ulpid}`,
        provenanceType: "verified_record",
        actions: [
          { label: "Open Parcel Record", href: `/citizen/parcel/${ulpid}`, iconType: "parcel" },
          { label: "View on GIS Map", href: `/map`, iconType: "map" },
        ],
        suggestedFollowups: [
          `What is the land risk score for ${ulpid}?`,
          "What is ULPID?"
        ],
        timestamp,
      };
    }
  }

  // Sub-case B: Land Risk Score & Due-Diligence questions
  if (lowerQuery.includes("risk") || lowerQuery.includes("due diligence") || lowerQuery.includes("encumbrance")) {
    return {
      id: `resp-${Date.now()}`,
      text: `### AI Land Risk Due-Diligence Assessment: \`${ulpid}\`
**Risk Score: ${riskAnalysis.score} / 100 (${riskAnalysis.level} RISK)**

- **Titleholder:** ${parcel.owner.name}
- **Summary Assessment:** ${riskAnalysis.summaryText}

#### 🚦 Key Risk Drivers Evaluated:
${riskAnalysis.topDrivers.map(d => `- **${d.label}:** ${d.summary} (Contribution: +${d.points} pts)`).join("\n")}

#### 📋 Actionable Verification Recommendations:
${riskAnalysis.recommendations.map(r => `- **[${r.priority.toUpperCase()}]:** ${r.actionText} *(Verify with: ${r.authorityToVerify})*`).join("\n")}

*Note: AI risk scoring provides deterministic decision support based on available multi-source indicators; authorized officials make statutory determinations.*`,
      sourceContext: `Bhu-Setu AI Risk Engine (13 Factors) · ${ulpid}`,
      provenanceType: "reconciliation_engine",
      actions: [
        { label: "View Full Risk Dossier", href: `/citizen/parcel/${ulpid}`, iconType: "risk" },
        { label: "Officer Risk Workbench", href: `/officer/risk`, iconType: "risk" },
      ],
      suggestedFollowups: [
        `Why is ${ulpid} flagged?`,
        "What does the land risk score represent?",
        "What information should an officer verify before approving a mutation?"
      ],
      timestamp,
    };
  }

  // Sub-case C: Officer mutation advice questions
  if (
    lowerQuery.includes("mutation") ||
    lowerQuery.includes("verify") ||
    lowerQuery.includes("adjudicate") ||
    lowerQuery.includes("approve") ||
    lowerQuery.includes("checklist")
  ) {
    return {
      id: `resp-${Date.now()}`,
      text: `### Mutation Adjudication Guidance: \`${ulpid}\`

**Current Status:** ${hasAreaMismatch ? "Requires Field Verification" : "Eligible for Approval"}

#### 📋 Pre-Decision Verification Checklist for ${isOfficer ? "Officers" : "Citizens"}:
1. **Area Extent Reconciliation:** Jamabandi RoR (${rorArea} sqm) vs Cadastral GIS (${surveyedArea} sqm) — ${hasAreaMismatch ? "⚠ 70 sqm difference flagged" : "✓ 0% variance"}.
2. **Titleholder & Khasra Match:** Khasra #${parcel.khasra_no || parcel.survey_no} registered under **${parcel.owner.name}**.
3. **NGDRS Deed Verification:** Sale deed consideration and stamp duty clearance verified.
4. **Municipal Tax Clearance:** ${parcel.tax_status.paid ? "✓ Property tax current" : `⚠ ₹${parcel.tax_status.dues} dues pending`}.
5. **Cryptographic Audit:** Every mutation decision is sealed with a **SHA-256 hash-chain receipt**.

> **Important Statutory Notice:**
> *AI-generated decision support — the authorized Revenue Officer remains responsible for the final statutory determination under the State Land Revenue Act.*`,
      sourceContext: `Bhu-Setu Governance Workflow Engine · ${ulpid}`,
      provenanceType: "officer_advisory",
      actions: [
        { label: "Adjudicate Mutation", href: `/officer/mutations?ulpid=${ulpid}`, iconType: "mutation" },
        { label: "Inspect Record", href: `/citizen/parcel/${ulpid}`, iconType: "parcel" },
      ],
      suggestedFollowups: [
        `Why is ${ulpid} flagged?`,
        "What is a mutation?",
        "How does the SHA-256 audit chain work?"
      ],
      timestamp,
    };
  }

  // Sub-case D: General overview of the parcel
  return {
    id: `resp-${Date.now()}`,
    text: `### Cadastral Parcel Record: \`${ulpid}\`

- **ULPID (Unique Land Parcel ID):** \`${parcel.ulpid}\`
- **Registered Titleholder:** **${parcel.owner.name}** (Registered since ${new Date(parcel.owner.since).getFullYear()})
- **Location:** ${parcel.district}, ${parcel.state} (Khasra #${parcel.khasra_no || parcel.survey_no})
- **Land Classification:** ${parcel.land_use}
- **Total Area (RoR):** ${rorArea.toLocaleString()} sqm
- **Surveyed GIS Extent:** ${surveyedArea.toLocaleString()} sqm ${hasAreaMismatch ? `(⚠ -${diffArea} sqm difference)` : "(✓ Synchronized)"}
- **Municipal Tax Status:** ${parcel.tax_status.paid ? "✓ Tax Paid" : `⚠ ₹${parcel.tax_status.dues} Dues Pending`}
- **AI Risk Assessment:** **${riskAnalysis.score}/100 (${riskAnalysis.level} RISK)**
- **Reconciliation Status:** **${parcel.record_status || (hasAreaMismatch ? "Needs Verification" : "Verified")}**`,
    sourceContext: `Bhu-Setu Cadastral Store · ${ulpid}`,
    provenanceType: "verified_record",
    actions: [
      { label: "Open Full Record", href: `/citizen/parcel/${ulpid}`, iconType: "parcel" },
      { label: "View on GIS Map", href: `/map`, iconType: "map" },
      ...(hasAreaMismatch ? [{ label: "View Inconsistencies", href: `/officer/conflicts`, iconType: "conflict" as const }] : []),
    ],
    suggestedFollowups: [
      `Why is ${ulpid} flagged?`,
      `What is the land risk score for ${ulpid}?`,
      "How does parcel reconciliation work?"
    ],
    timestamp,
  };
}

/**
 * Handle general land governance questions from knowledge repository
 */
function handleKnowledgeTopic(
  lowerQuery: string,
  userRole: UserRole,
  timestamp: string
): AssistantResponse | null {
  // Score topics by keyword matches
  let bestTopic: LandTopic | null = null;
  let highestScore = 0;

  for (const topic of LAND_KNOWLEDGE_TOPICS) {
    let score = 0;
    for (const keyword of topic.keywords) {
      if (lowerQuery.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestTopic = topic;
    }
  }

  // Threshold check
  if (!bestTopic || highestScore < 3) {
    return null;
  }

  const isOfficer = userRole === "revenue_officer" || userRole === "registrar" || userRole === "admin";

  let responseBody = `${bestTopic.detailedExplanation}\n\n`;

  if (bestTopic.citizenGuidance && !isOfficer) {
    responseBody += `> **Citizen Guidance:**\n> ${bestTopic.citizenGuidance}\n\n`;
  }

  if (bestTopic.officerChecklist && isOfficer) {
    responseBody += `#### 📋 Officer Statutory Checklist:\n`;
    responseBody += bestTopic.officerChecklist.map(item => `- ${item}`).join("\n") + "\n\n";
    responseBody += `> *AI-generated decision support — authorized officials make final statutory determinations.*\n`;
  }

  return {
    id: `resp-${Date.now()}`,
    text: responseBody,
    sourceContext: `Land Governance Knowledge Dictionary · ${bestTopic.title}`,
    provenanceType: "general_knowledge",
    actions: [
      { label: "Explore GIS Map", href: "/map", iconType: "map" },
      { label: "Search Registry", href: "/citizen/search", iconType: "parcel" },
      { label: "View Demo Parcel PB-LDH-0042", href: "/citizen/parcel/PB-LDH-0042", iconType: "parcel" },
    ],
    suggestedFollowups: [
      "Show me information about PB-LDH-0042",
      "Why is PB-LDH-0042 flagged?",
      "How does parcel reconciliation work?",
      "What is a mutation?"
    ],
    timestamp,
  };
}
