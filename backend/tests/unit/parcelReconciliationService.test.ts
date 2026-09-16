import { ParcelReconciliationService } from '../../src/services/parcelReconciliationService';
import { IParcelRepository } from '../../src/repositories/parcelRepository';
import { IStateLandRecordAdapter } from '../../src/integrations/adapters/stateLandRecordAdapter';
import { IBhuNakshaGisAdapter } from '../../src/integrations/adapters/bhuNakshaGisAdapter';
import { INgdrsRegistrationAdapter } from '../../src/integrations/adapters/ngdrsRegistrationAdapter';
import { ParcelRecord } from '../../src/models/parcel';

describe('ParcelReconciliationService (Stage 4 Multi-Source GIS Reconciliation)', () => {
  let mockRepo: jest.Mocked<IParcelRepository>;
  let mockRorAdapter: jest.Mocked<IStateLandRecordAdapter>;
  let mockGisAdapter: jest.Mocked<IBhuNakshaGisAdapter>;
  let mockDeedAdapter: jest.Mocked<INgdrsRegistrationAdapter>;
  let service: ParcelReconciliationService;

  const baseParcel: ParcelRecord = {
    parcel_id: 'PARCEL-PB-LDH-0042',
    ulpid: 'PB-LDH-0042',
    ulpin: 'PB-LDH-0042',
    survey_no: '142/3',
    village: 'Burj Littan',
    district: 'Ludhiana',
    state: 'Punjab',
    record_status: 'conflict_detected',
    geometry: {
      type: 'Polygon',
      coordinates: [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]]
    },
    owner: { name: 'Ramesh Kumar', since: '2011-04-12' },
    area_sqm: 1250,
    ror_area_sqm: 1250,
    surveyed_area_sqm: 1180,
    land_use: 'Residential',
    tax_status: { paid: true, last_paid: '2026-03-01', dues: 0 },
    mutations: []
  };

  beforeEach(() => {
    mockRepo = {
      findByUlpid: jest.fn(),
      search: jest.fn(),
      findConflictsByUlpid: jest.fn(),
      getAllGeoJson: jest.fn()
    };
    mockRorAdapter = {
      fetchRoRByUlpid: jest.fn()
    };
    mockGisAdapter = {
      fetchParcelGeometry: jest.fn()
    };
    mockDeedAdapter = {
      fetchDeedByUlpid: jest.fn()
    };

    service = new ParcelReconciliationService(
      mockRepo,
      mockRorAdapter,
      mockGisAdapter,
      mockDeedAdapter
    );
  });

  it('should detect area mismatch between RoR declared extent (1250 sqm) and Cadastral GIS (1180 sqm)', async () => {
    mockRepo.findByUlpid.mockResolvedValue(baseParcel);
    mockRorAdapter.fetchRoRByUlpid.mockResolvedValue({
      khewat_no: '74/82',
      khatauni_no: '112',
      khasra_no: '142/3',
      declared_area_sqm: 1250,
      owner_name: 'Ramesh Kumar',
      village: 'Burj Littan',
      district: 'Ludhiana',
      state: 'Punjab',
      last_mutation_date: '2011-04-12'
    });
    mockGisAdapter.fetchParcelGeometry.mockResolvedValue({
      calculated_area_sqm: 1180,
      perimeter_meters: 142.5,
      centroid: [30.905, 75.855],
      srid: 4326,
      layer_name: 'PB_Ludhiana_Cadastral_2026'
    });
    mockDeedAdapter.fetchDeedByUlpid.mockResolvedValue({
      deed_number: 'DEED-2011-LDH-4821',
      registration_date: '2011-04-12',
      registered_party: 'Ramesh Kumar',
      encumbrance_status: 'clear'
    });

    const report = await service.reconcileParcel('PB-LDH-0042');

    expect(report.ulpid).toBe('PB-LDH-0042');
    expect(report.has_conflicts).toBe(true);
    expect(report.record_status).toBe('conflict_detected');

    const areaFinding = report.findings.find((f) => f.field_compared.includes('Surface Extent'));
    expect(areaFinding).toBeDefined();
    expect(areaFinding?.source_a_value).toBe('1250 sqm');
    expect(areaFinding?.source_b_value).toBe('1180 sqm');
    expect(areaFinding?.difference).toBe('70 sqm variance');
    expect(areaFinding?.severity).toBe('medium');
    expect(areaFinding?.recommended_action).toBe('review');
  });

  it('should detect titleholder discrepancy between RoR and NGDRS Registered Deed', async () => {
    mockRepo.findByUlpid.mockResolvedValue(baseParcel);
    mockRorAdapter.fetchRoRByUlpid.mockResolvedValue({
      khewat_no: '74/82',
      khatauni_no: '112',
      khasra_no: '142/3',
      declared_area_sqm: 1250,
      owner_name: 'Ramesh Kumar',
      village: 'Burj Littan',
      district: 'Ludhiana',
      state: 'Punjab',
      last_mutation_date: '2011-04-12'
    });
    mockGisAdapter.fetchParcelGeometry.mockResolvedValue({
      calculated_area_sqm: 1250,
      perimeter_meters: 142.5,
      centroid: [30.905, 75.855],
      srid: 4326,
      layer_name: 'PB_Ludhiana_Cadastral_2026'
    });
    mockDeedAdapter.fetchDeedByUlpid.mockResolvedValue({
      deed_number: 'DEED-2023-DISPUTED',
      registration_date: '2023-08-10',
      registered_party: 'Suresh Kumar (Heir)',
      encumbrance_status: 'clear'
    });

    const report = await service.reconcileParcel('PB-LDH-0042');

    const titleFinding = report.findings.find((f) => f.field_compared.includes('Titleholder'));
    expect(titleFinding).toBeDefined();
    expect(titleFinding?.severity).toBe('high');
    expect(titleFinding?.source_a_value).toBe('Ramesh Kumar');
    expect(titleFinding?.source_b_value).toBe('Suresh Kumar (Heir)');
    expect(report.record_status).toBe('conflict_detected');
  });

  it('should return verified status when all multi-source systems are aligned', async () => {
    const verifiedParcel: ParcelRecord = {
      ...baseParcel,
      ulpid: 'PB-LDH-0044',
      area_sqm: 1180,
      ror_area_sqm: 1180,
      surveyed_area_sqm: 1180,
      record_status: 'verified'
    };

    mockRepo.findByUlpid.mockResolvedValue(verifiedParcel);
    mockRorAdapter.fetchRoRByUlpid.mockResolvedValue({
      khewat_no: '99/101',
      khatauni_no: '160',
      khasra_no: '142/5',
      declared_area_sqm: 1180,
      owner_name: 'Harpreet Kaur',
      village: 'Burj Littan',
      district: 'Ludhiana',
      state: 'Punjab',
      last_mutation_date: '2019-01-20'
    });
    mockGisAdapter.fetchParcelGeometry.mockResolvedValue({
      calculated_area_sqm: 1180,
      perimeter_meters: 138.0,
      centroid: [30.901, 75.845],
      srid: 4326,
      layer_name: 'PB_Ludhiana_Cadastral_2026'
    });
    mockDeedAdapter.fetchDeedByUlpid.mockResolvedValue({
      deed_number: 'DEED-2019-PB-44',
      registration_date: '2019-01-20',
      registered_party: 'Harpreet Kaur',
      encumbrance_status: 'clear'
    });

    const report = await service.reconcileParcel('PB-LDH-0044');

    expect(report.has_conflicts).toBe(false);
    expect(report.findings.length).toBe(0);
    expect(report.record_status).toBe('verified');
    expect(report.confidence_score).toBe(0.95);
  });
});
