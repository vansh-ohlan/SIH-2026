import {
  ParcelRecord,
  ParcelReconciliationReport,
  ParcelReconciliationFinding,
  MultiSourceRecords,
  RecordStatus
} from '../models/parcel';
import { IParcelRepository, parcelRepository } from '../repositories/parcelRepository';
import { stateLandRecordAdapter, IStateLandRecordAdapter } from '../integrations/adapters/stateLandRecordAdapter';
import { bhuNakshaGisAdapter, IBhuNakshaGisAdapter } from '../integrations/adapters/bhuNakshaGisAdapter';
import { ngdrsRegistrationAdapter, INgdrsRegistrationAdapter } from '../integrations/adapters/ngdrsRegistrationAdapter';
import { logger } from '../utils/logger';

export interface IParcelReconciliationService {
  reconcileParcel(ulpid: string): Promise<ParcelReconciliationReport>;
}

/**
 * Parcel-Centric Multi-Source Data Reconciliation Service.
 * Reconciles land records across State RoR, Bhu-Naksha GIS, NGDRS Registry, and Municipal databases.
 * 
 * Generates explainable decision-support findings:
 * - field compared
 * - source A value
 * - source B value
 * - difference
 * - reason
 * - severity: low / medium / high
 * - recommended action: review / verify / no_action
 */
export class ParcelReconciliationService implements IParcelReconciliationService {
  constructor(
    private readonly repo: IParcelRepository = parcelRepository,
    private readonly rorAdapter: IStateLandRecordAdapter = stateLandRecordAdapter,
    private readonly gisAdapter: IBhuNakshaGisAdapter = bhuNakshaGisAdapter,
    private readonly deedAdapter: INgdrsRegistrationAdapter = ngdrsRegistrationAdapter
  ) {}

  public async reconcileParcel(ulpid: string): Promise<ParcelReconciliationReport> {
    logger.info(`Starting parcel-centric cross-data reconciliation for ULPID: ${ulpid}`);

    // 1. Fetch core PostGIS parcel record
    const parcel = await this.repo.findByUlpid(ulpid);

    // 2. Fetch multi-source adapters
    const [rorData, gisData, deedData] = await Promise.all([
      this.rorAdapter.fetchRoRByUlpid(ulpid),
      this.gisAdapter.fetchParcelGeometry(ulpid),
      this.deedAdapter.fetchDeedByUlpid(ulpid)
    ]);

    const findings: ParcelReconciliationFinding[] = [];

    // Derive base attributes
    const ownerName = parcel?.owner.name || rorData?.owner_name || 'Unknown Owner';
    const surveyNo = parcel?.survey_no || rorData?.khasra_no || '142/3';
    const village = parcel?.village || rorData?.village || (ulpid.startsWith('PB') ? 'Burj Littan' : ulpid.startsWith('TN') ? 'Nemili' : 'Sector 17');
    const district = parcel?.district || rorData?.district || (ulpid.startsWith('PB') ? 'Ludhiana' : ulpid.startsWith('TN') ? 'Kanchipuram' : 'Chandigarh');
    const state = parcel?.state || rorData?.state || (ulpid.startsWith('PB') ? 'Punjab' : ulpid.startsWith('TN') ? 'Tamil Nadu' : 'Chandigarh (UT)');

    // Rule 1: RoR Declared Area vs Bhu-Naksha GIS Polygon Calculated Area
    const rorArea = rorData?.declared_area_sqm || parcel?.ror_area_sqm || (ulpid === 'PB-LDH-0042' ? 1250 : parcel?.area_sqm || 1000);
    const gisArea = gisData?.calculated_area_sqm || parcel?.surveyed_area_sqm || (ulpid === 'PB-LDH-0042' ? 1180 : parcel?.area_sqm || 1000);
    const areaDiff = Math.abs(rorArea - gisArea);

    if (areaDiff > 0.01) {
      findings.push({
        field_compared: 'Parcel Surface Extent (Area)',
        source_a_name: 'State RoR (Jamabandi)',
        source_a_value: `${rorArea} sqm`,
        source_b_name: 'Bhu-Naksha GIS Polygon (EPSG:4326)',
        source_b_value: `${gisArea} sqm`,
        difference: `${areaDiff} sqm variance`,
        reason: 'Digitized ground cadastral polygon boundary differs from legacy paper Jamabandi extent.',
        severity: 'medium',
        recommended_action: 'review'
      });
    }

    // Rule 2: Titleholder Name vs NGDRS Registered Party
    if (deedData && rorData) {
      const cleanRorOwner = rorData.owner_name.trim().toLowerCase();
      const cleanDeedOwner = deedData.registered_party.trim().toLowerCase();

      if (cleanRorOwner !== cleanDeedOwner) {
        findings.push({
          field_compared: 'Registered Titleholder / Malik',
          source_a_name: 'State RoR Record',
          source_a_value: rorData.owner_name,
          source_b_name: 'NGDRS Registered Deed',
          source_b_value: deedData.registered_party,
          difference: `Title mismatch: "${rorData.owner_name}" vs "${deedData.registered_party}"`,
          reason: 'Deed registration record holder differs from active revenue ledger, indicating possible unrecorded succession.',
          severity: 'high',
          recommended_action: 'review'
        });
      }
    }

    // Rule 3: Survey / Khasra Number Consistency
    if (rorData && (!rorData.khasra_no || rorData.khasra_no.trim() === '')) {
      findings.push({
        field_compared: 'Survey / Khasra Number',
        source_a_name: 'State Land Register',
        source_a_value: 'Missing / Unspecified',
        source_b_name: 'Cadastral GIS Index',
        source_b_value: surveyNo,
        difference: 'Missing survey number in paper record',
        reason: 'Statutory land parcel number is omitted from revenue register.',
        severity: 'medium',
        recommended_action: 'verify'
      });
    }

    // Rule 4: Encumbrance & Mutation Status
    if (deedData && (deedData.encumbrance_status === 'under_review' || deedData.pending_mutation_claim)) {
      findings.push({
        field_compared: 'Legal Encumbrance & Mutation Status',
        source_a_name: 'NGDRS Sub-Registrar Registry',
        source_a_value: `Status: ${deedData.encumbrance_status.toUpperCase()}`,
        source_b_name: 'Revenue Department Workflow',
        source_b_value: deedData.pending_mutation_claim?.nature_of_transfer || 'Pending Officer Adjudication',
        difference: 'Active adjudication pending in revenue registry',
        reason: 'Pending statutory boundary reconciliation or succession notice under officer review.',
        severity: 'medium',
        recommended_action: 'review'
      });
    }

    // Determine Record Status
    let recordStatus: RecordStatus = 'verified';
    if (findings.some((f) => f.severity === 'high')) {
      recordStatus = 'conflict_detected';
    } else if (findings.some((f) => f.severity === 'medium')) {
      recordStatus = 'conflict_detected';
    } else if (parcel?.tax_status && !parcel.tax_status.paid) {
      recordStatus = 'needs_verification';
    }

    const multiSourceSummary: MultiSourceRecords = {
      state_ror: rorData
        ? {
            khewat_no: rorData.khewat_no,
            khatauni_no: rorData.khatauni_no,
            khasra_no: rorData.khasra_no,
            declared_area_sqm: rorData.declared_area_sqm,
            owner_name: rorData.owner_name,
            last_mutation_date: rorData.last_mutation_date
          }
        : undefined,
      cadastral_gis: gisData
        ? {
            polygon_area_sqm: gisData.calculated_area_sqm,
            perimeter_m: gisData.perimeter_meters,
            centroid: gisData.centroid,
            srid: gisData.srid,
            layer_name: gisData.layer_name
          }
        : undefined,
      registration_ngdrs: deedData
        ? {
            deed_number: deedData.deed_number,
            registration_date: deedData.registration_date,
            registered_party: deedData.registered_party,
            encumbrance_status: deedData.encumbrance_status
          }
        : undefined,
      municipal_zoning: {
        zone_code: parcel?.land_use === 'Commercial' ? 'ZONE-C1' : 'ZONE-R2',
        permitted_use: parcel?.land_use || 'Residential',
        circle_rate_per_sqm: parcel?.land_use === 'Commercial' ? 15000 : 6500
      }
    };

    return {
      parcel_id: `PARCEL-${ulpid}`,
      ulpid,
      ulpin: ulpid,
      survey_no: surveyNo,
      owner_name: ownerName,
      village,
      district,
      state,
      record_status: recordStatus,
      findings,
      has_conflicts: findings.length > 0,
      source_records: multiSourceSummary,
      confidence_score: findings.length === 0 ? 0.95 : 0.82,
      disclaimer: 'DEMO / SYNTHETIC DATA — Automated cross-reconciliation for hackathon demonstration. Authorized officials make final statutory determinations.'
    };
  }
}

export const parcelReconciliationService = new ParcelReconciliationService();
