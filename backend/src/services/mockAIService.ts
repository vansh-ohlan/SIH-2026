// backend/src/services/mockAIService.ts
// Deterministic Parcel Intelligence Decision-Support Assistant
// No external AI provider / API keys are used.

import { AIResponse } from '../models/ai';
import { SYNTHETIC_SEED_PARCELS, SeedParcelData } from '../db/seeder';

interface ParcelDataRecord {
  ulpid: string;
  owner_name: string;
  owner_since: string;
  area_sqm: number;
  land_use: string;
  ror_area_sqm: number;
  surveyed_area_sqm: number;
  tax_paid?: boolean;
  tax_last_paid?: string;
  tax_dues?: number;
  conflicts?: Array<{ type: string; description: string; severity?: string }>;
}

// Known parcel records lookup
const KNOWN_PARCELS: Record<string, ParcelDataRecord> = {
  'PB-LDH-0042': {
    ulpid: 'PB-LDH-0042',
    owner_name: 'Ramesh Kumar',
    owner_since: '2011-04-12',
    area_sqm: 1250,
    land_use: 'Residential',
    ror_area_sqm: 1250,
    surveyed_area_sqm: 1180,
    tax_paid: true,
    tax_last_paid: '2026-03-01',
    tax_dues: 0,
    conflicts: [
      {
        type: 'area_mismatch',
        description: 'RoR area (1250 sqm) does not match surveyed area (1180 sqm)',
        severity: 'medium',
      },
    ],
  },
  'PB-LDH-0043': {
    ulpid: 'PB-LDH-0043',
    owner_name: 'Suresh Singh',
    owner_since: '2018-09-20',
    area_sqm: 980,
    land_use: 'Commercial',
    ror_area_sqm: 980,
    surveyed_area_sqm: 980,
    tax_paid: true,
    tax_last_paid: '2026-02-15',
    tax_dues: 0,
    conflicts: [],
  },
  'PB-LDH-0044': {
    ulpid: 'PB-LDH-0044',
    owner_name: 'Priya Sharma',
    owner_since: '2020-01-10',
    area_sqm: 1500,
    land_use: 'Agricultural',
    ror_area_sqm: 1500,
    surveyed_area_sqm: 1500,
    tax_paid: true,
    tax_last_paid: '2026-01-05',
    tax_dues: 0,
    conflicts: [],
  },
  'CH-SEC-1701': {
    ulpid: 'CH-SEC-1701',
    owner_name: 'Rajiv Walia & Associates',
    owner_since: '2015-08-10',
    area_sqm: 2400,
    land_use: 'Commercial',
    ror_area_sqm: 2400,
    surveyed_area_sqm: 2400,
    tax_paid: true,
    tax_last_paid: '2026-02-28',
    tax_dues: 0,
    conflicts: [],
  },
  'TN-SPR-0814': {
    ulpid: 'TN-SPR-0814',
    owner_name: 'K. Venkatesan',
    owner_since: '2008-11-10',
    area_sqm: 3200,
    land_use: 'Agricultural',
    ror_area_sqm: 3200,
    surveyed_area_sqm: 3200,
    tax_paid: false,
    tax_last_paid: '2025-01-20',
    tax_dues: 4800,
    conflicts: [
      {
        type: 'tax_dues',
        description: 'Outstanding dues of ₹4,800 unresolved',
        severity: 'low',
      },
    ],
  },
};

function getParcelRecord(ulpid: string): ParcelDataRecord | null {
  if (KNOWN_PARCELS[ulpid]) return KNOWN_PARCELS[ulpid];
  const seed = SYNTHETIC_SEED_PARCELS.find((p) => p.ulpid === ulpid);
  if (seed) {
    return {
      ulpid: seed.ulpid,
      owner_name: seed.owner_name,
      owner_since: seed.owner_since,
      area_sqm: seed.area_sqm,
      land_use: seed.land_use,
      ror_area_sqm: seed.ror_area_sqm ?? seed.area_sqm,
      surveyed_area_sqm: seed.surveyed_area_sqm ?? seed.area_sqm,
      tax_paid: seed.tax_paid,
      tax_last_paid: seed.tax_last_paid,
      tax_dues: seed.tax_dues,
    };
  }
  return null;
}

export class MockAIService {
  /**
   * Analyze a parcel and return a structured checklist based on verified parcel data.
   */
  async analyzeParcel(ulpid: string): Promise<AIResponse[]> {
    const parcel = getParcelRecord(ulpid);

    if (!parcel) {
      return [
        {
          status: 'attention',
          reason: 'Data unavailable for this parcel.',
          source: 'mockAI',
          dataAvailability: 'unavailable',
        },
      ];
    }

    const rorArea = parcel.ror_area_sqm || parcel.area_sqm;
    const surveyedArea = parcel.surveyed_area_sqm || parcel.area_sqm;
    const areaDiff = Math.abs(rorArea - surveyedArea);
    const hasAreaMismatch = areaDiff > 0;
    const diffPercent = ((areaDiff / rorArea) * 100).toFixed(1);

    const results: AIResponse[] = [
      {
        status: 'recommend',
        reason: `Ownership — available (${parcel.owner_name})`,
        source: 'mockAI',
        dataAvailability: 'available',
      },
      {
        status: 'recommend',
        reason: `Land use — ${parcel.land_use}`,
        source: 'mockAI',
        dataAvailability: 'available',
      },
    ];

    if (hasAreaMismatch) {
      results.push({
        status: 'attention',
        reason: `Area mismatch — ${areaDiff} sqm / ${diffPercent}%, medium`,
        source: 'mockAI',
        dataAvailability: 'available',
      });
      results.push({
        status: 'attention',
        reason: 'Officer review — recommended for area discrepancy',
        source: 'mockAI',
        dataAvailability: 'available',
      });
    } else {
      results.push({
        status: 'recommend',
        reason: `Area verification — RoR and survey boundary match (${rorArea.toLocaleString()} sqm)`,
        source: 'mockAI',
        dataAvailability: 'available',
      });
      results.push({
        status: 'recommend',
        reason: 'Officer review — no anomaly detected',
        source: 'mockAI',
        dataAvailability: 'available',
      });
    }

    // Explicitly declare genuinely unavailable fields rather than inventing false facts
    results.push({
      status: 'attention',
      reason: 'Mortgage registry — Data unavailable',
      source: 'mockAI',
      dataAvailability: 'unavailable',
    });

    results.push({
      status: 'attention',
      reason: 'Zoning master plan — Data unavailable',
      source: 'mockAI',
      dataAvailability: 'unavailable',
    });

    return results;
  }

  /**
   * Deterministic parcel-aware question answering based on genuine parcel records.
   */
  async askParcel(ulpid: string, question: string): Promise<AIResponse> {
    const parcel = getParcelRecord(ulpid);
    const q = question.toLowerCase().trim();

    if (!parcel) {
      return {
        status: 'attention',
        reason: 'Data unavailable for this parcel.',
        source: 'mockAI',
        dataAvailability: 'unavailable',
      };
    }

    const rorArea = parcel.ror_area_sqm || parcel.area_sqm;
    const surveyedArea = parcel.surveyed_area_sqm || parcel.area_sqm;
    const areaDiff = Math.abs(rorArea - surveyedArea);
    const hasAreaMismatch = areaDiff > 0;
    const diffPercent = ((areaDiff / rorArea) * 100).toFixed(1);

    // 1. OWNER / OWNERSHIP
    if (
      q.includes('who own') ||
      q.includes('owner') ||
      q.includes('ownership') ||
      q.includes('titleholder') ||
      q.includes('whose parcel') ||
      q.includes('name of owner')
    ) {
      return {
        status: 'recommend',
        reason: `The recorded owner is ${parcel.owner_name}.`,
        source: 'mockAI',
        dataAvailability: 'available',
      };
    }

    // 2. OFFICER REVIEW / VERIFICATION REASON
    if (
      (q.includes('officer') && q.includes('review')) ||
      (q.includes('why') && (q.includes('review') || q.includes('officer'))) ||
      q.includes('verification reason') ||
      q.includes('need officer review') ||
      q.includes('adjudication')
    ) {
      if (hasAreaMismatch) {
        return {
          status: 'attention',
          reason: `${parcel.ulpid} requires officer review due to an automated area discrepancy between the Record of Rights (${rorArea.toLocaleString()} sqm) and Cadastral Survey geometry (${surveyedArea.toLocaleString()} sqm), reflecting a ${areaDiff} sqm (${diffPercent}%) medium-severity variance.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      } else if (parcel.conflicts && parcel.conflicts.length > 0) {
        const issues = parcel.conflicts.map((c) => c.description).join('; ');
        return {
          status: 'attention',
          reason: `Officer review is required to verify: ${issues}.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      } else {
        return {
          status: 'recommend',
          reason: `No officer review is required for ${parcel.ulpid}; all land and survey records are clear.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      }
    }

    // 3. AREA / SIZE / EXTENT
    if (
      q.includes('area') ||
      q.includes('size') ||
      q.includes('sqm') ||
      q.includes('extent') ||
      q.includes('dimension') ||
      q.includes('how big') ||
      q.includes('square meter')
    ) {
      if (hasAreaMismatch) {
        return {
          status: 'attention',
          reason: `${parcel.ulpid} has a recorded RoR area of ${rorArea.toLocaleString()} sqm. The surveyed area is ${surveyedArea.toLocaleString()} sqm, resulting in a ${areaDiff} sqm difference (${diffPercent}% mismatch).`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      } else {
        return {
          status: 'recommend',
          reason: `${parcel.ulpid} has a recorded RoR area of ${rorArea.toLocaleString()} sqm, matching the surveyed cadastral area.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      }
    }

    // 4. ISSUE / PROBLEM / CONFLICT / MISMATCH / DISPUTE / ANOMALY
    if (
      q.includes('issue') ||
      q.includes('problem') ||
      q.includes('conflict') ||
      q.includes('mismatch') ||
      q.includes('anomaly') ||
      q.includes('discrepancy') ||
      q.includes('dispute') ||
      q.includes('litigation') ||
      q.includes('encroach')
    ) {
      if (hasAreaMismatch) {
        return {
          status: 'attention',
          reason: `Yes. A potential area mismatch has been detected. The RoR records ${rorArea.toLocaleString()} sqm while the surveyed area is ${surveyedArea.toLocaleString()} sqm. The difference is ${areaDiff} sqm (${diffPercent}%), classified as a medium-severity anomaly requiring officer review.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      } else if (parcel.conflicts && parcel.conflicts.length > 0) {
        const issues = parcel.conflicts.map((c) => c.description).join('; ');
        return {
          status: 'attention',
          reason: `Yes. Active issue(s) detected: ${issues}.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      } else {
        return {
          status: 'recommend',
          reason: `No active conflicts or boundary mismatches are detected on record for ${parcel.ulpid}.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      }
    }

    // 5. COMMERCIAL / BUILD / CONSTRUCT / DEVELOPMENT
    if (
      q.includes('commercial') ||
      q.includes('build') ||
      q.includes('construct') ||
      q.includes('development') ||
      q.includes('factory') ||
      q.includes('shop') ||
      q.includes('hotel') ||
      q.includes('permission') ||
      q.includes('structure')
    ) {
      if (parcel.land_use.toLowerCase() === 'residential') {
        return {
          status: 'attention',
          reason: `Based on the demo parcel data, ${parcel.ulpid} is classified as Residential. Commercial development is therefore not recommended based solely on the current classification. Any actual development decision requires verification against applicable local zoning regulations and approval from the competent planning authority.`,
          alternative: 'Residential + limited mixed-use may be permitted subject to applicable local regulations.',
          requiredApproval: 'Planning authority',
          source: 'mockAI',
          dataAvailability: 'available',
        };
      } else if (parcel.land_use.toLowerCase() === 'commercial') {
        return {
          status: 'recommend',
          reason: `Based on the demo parcel data, ${parcel.ulpid} is classified as Commercial. Commercial development is consistent with this land use classification, subject to standard municipal building plan approvals and safety clearances.`,
          alternative: undefined,
          requiredApproval: 'Local planning & municipal authority',
          source: 'mockAI',
          dataAvailability: 'available',
        };
      } else if (parcel.land_use.toLowerCase() === 'agricultural') {
        return {
          status: 'reject',
          reason: `Based on the demo parcel data, ${parcel.ulpid} is classified as Agricultural. Non-agricultural construction or commercial development is not permitted without a formal Change of Land Use (CLU) approval from the competent revenue authority.`,
          alternative: 'Agricultural allied activities may be permitted without CLU.',
          requiredApproval: 'District Collector / Revenue authority (CLU)',
          source: 'mockAI',
          dataAvailability: 'available',
        };
      }
    }

    // 6. LAND USE / ZONING / CLASSIFICATION
    if (
      q.includes('land use') ||
      q.includes('classification') ||
      q.includes('category') ||
      q.includes('type of land') ||
      q.includes('zoning')
    ) {
      return {
        status: 'recommend',
        reason: `The parcel is classified as ${parcel.land_use}.`,
        source: 'mockAI',
        dataAvailability: 'available',
      };
    }

    // 7. SUMMARY / EVERYTHING / ALL DETAILS / OVERVIEW / REPORT
    if (
      q.includes('everything') ||
      q.includes('summary') ||
      q.includes('overview') ||
      q.includes('all details') ||
      q.includes('tell me') ||
      q.includes('report')
    ) {
      const summaryLines = [
        `Parcel: ${parcel.ulpid}`,
        `Owner: ${parcel.owner_name}`,
        `Land use: ${parcel.land_use}`,
        `RoR area: ${rorArea.toLocaleString()} sqm`,
        `Surveyed area: ${surveyedArea.toLocaleString()} sqm`,
        `Difference: ${hasAreaMismatch ? `${areaDiff} sqm / ${diffPercent}%` : '0 sqm (None)'}`,
        `GIS status: ${hasAreaMismatch ? 'Area mismatch detected' : 'Spatial boundary verified'}`,
        `Severity: ${hasAreaMismatch ? 'Medium' : 'None'}`,
        `Recommended action: ${
          hasAreaMismatch
            ? 'Officer review of the area discrepancy'
            : 'No action required — Title & GIS clear'
        }`,
      ];

      return {
        status: hasAreaMismatch ? 'attention' : 'recommend',
        reason: summaryLines.join('\n'),
        source: 'mockAI',
        dataAvailability: 'available',
      };
    }

    // 8. TAX
    if (
      q.includes('tax') ||
      q.includes('dues') ||
      q.includes('arrear') ||
      q.includes('revenue dues')
    ) {
      if (parcel.tax_paid !== undefined) {
        return {
          status: parcel.tax_paid ? 'recommend' : 'attention',
          reason: parcel.tax_paid
            ? `Tax status: Paid and up-to-date (Last paid: ${parcel.tax_last_paid ?? '2026-03-01'}).`
            : `Tax status: Outstanding dues of ₹${parcel.tax_dues?.toLocaleString() ?? 0} pending payment.`,
          source: 'mockAI',
          dataAvailability: 'available',
        };
      }
    }

    // 9. GENUINELY UNAVAILABLE / UNSUPPORTED QUERIES (Mortgage, Satellite, etc.)
    return {
      status: 'attention',
      reason: 'Data unavailable for this parcel.',
      source: 'mockAI',
      dataAvailability: 'unavailable',
    };
  }
}

export const mockAIService = new MockAIService();
