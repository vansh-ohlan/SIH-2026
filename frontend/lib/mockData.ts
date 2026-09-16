import {
  Parcel,
  SearchResult,
  Conflict,
  GeoFeatureCollection,
  PilotRegion,
  RegionId,
  EncroachmentAlert,
  UtilityLine,
  ParcelReconciliationReport,
  ParcelReconciliationFinding,
} from "./types";

// ==========================================
// 1. Multi-State Pilot Regions (Land Stack)
// ==========================================
export const PILOT_REGIONS: PilotRegion[] = [
  {
    id: "punjab",
    name: "Ludhiana Pilot",
    state: "Punjab",
    center: [30.908, 75.855],
    zoom: 14,
    description: "Mixed agricultural, industrial & urban residential cadastre",
  },
  {
    id: "chandigarh",
    name: "Chandigarh Pilot Area",
    state: "Chandigarh (UT)",
    center: [30.7333, 76.7794],
    zoom: 15,
    description: "Urban planned sectors, green corridors & administrative zones",
  },
  {
    id: "tamil_nadu",
    name: "Tamil Nadu Pilot Area",
    state: "Tamil Nadu",
    center: [12.9815, 79.9722],
    zoom: 14,
    description: "Sriperumbudur auto-corridor & eco-sensitive lake catchment",
  },
];

// ==========================================
// 2. Comprehensive Parcel Database with Ledger Receipts
// ==========================================
export const MOCK_PARCELS: Record<string, Parcel> = {
  // --- Punjab (Ludhiana) Parcels ---
  "PB-LDH-0042": {
    parcel_id: "PARCEL-PB-LDH-0042",
    ulpid: "PB-LDH-0042",
    ulpin: "PB-LDH-0042",
    survey_no: "142/3",
    khasra_no: "142/3",
    village: "Burj Littan",
    district: "Ludhiana",
    state: "Punjab",
    tehsil: "Ludhiana East",
    record_status: "Conflict Detected",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [75.85, 30.9],
          [75.86, 30.9],
          [75.86, 30.91],
          [75.85, 30.91],
          [75.85, 30.9],
        ],
      ],
    },
    owner: { name: "Ramesh Kumar", since: "2011-04-12", father_or_husband_name: "Suresh Kumar" },
    area_sqm: 1250,
    ror_area_sqm: 1250,
    surveyed_area_sqm: 1180,
    land_use: "Residential",
    valuation_band: "Band B (Standard Residential)",
    rate_per_sqm: 6500,
    tax_status: { paid: true, last_paid: "2026-03-01", dues: 0 },
    mutations: [
      { date: "2011-04-12", type: "Sale", from: "State", to: "Ramesh Kumar" },
    ],
    source_records: {
      state_ror: {
        khewat_no: "74/82",
        khatauni_no: "112",
        khasra_no: "142/3",
        declared_area_sqm: 1250,
        owner_name: "Ramesh Kumar",
        last_mutation_date: "2011-04-12",
      },
      cadastral_gis: {
        polygon_area_sqm: 1180,
        perimeter_m: 142.5,
        centroid: [30.905, 75.855],
        srid: 4326,
        layer_name: "PB_Ludhiana_Cadastral_2026",
      },
      registration_ngdrs: {
        deed_number: "DEED-2011-LDH-4821",
        registration_date: "2011-04-12",
        registered_party: "Ramesh Kumar",
        encumbrance_status: "under_review",
      },
      municipal_zoning: {
        zone_code: "ZONE-R2",
        permitted_use: "Residential (Gair Mumkin Abadi)",
        circle_rate_per_sqm: 6500,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-PB-2026-0042-IMMUTABLE",
      block_number: 104829,
      block_hash: "9f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f8",
      previous_hash: "3b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c",
      merkle_root: "e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2",
      timestamp: "2026-03-01T06:30:00.000Z",
      signing_authority: "Directorate of Land Records & Revenue · Government of Punjab",
      jurisdiction: "Ludhiana West Sub-Division, Punjab",
      verification_status: "verified_immutable",
    },
  },
  "PB-LDH-0043": {
    parcel_id: "PARCEL-PB-LDH-0043",
    ulpid: "PB-LDH-0043",
    ulpin: "PB-LDH-0043",
    survey_no: "142/4",
    khasra_no: "142/4",
    village: "Burj Littan",
    district: "Ludhiana",
    state: "Punjab",
    tehsil: "Ludhiana East",
    record_status: "Needs Verification",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [75.861, 30.9],
          [75.871, 30.9],
          [75.871, 30.909],
          [75.861, 30.909],
          [75.861, 30.9],
        ],
      ],
    },
    owner: { name: "Suresh Singh", since: "2016-07-02", father_or_husband_name: "Jaswant Singh" },
    area_sqm: 980,
    ror_area_sqm: 980,
    surveyed_area_sqm: 980,
    land_use: "Agricultural",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 2400,
    tax_status: { paid: false, last_paid: "2024-11-15", dues: 3200 },
    mutations: [
      { date: "2016-07-02", type: "Inheritance", from: "Gurdev Singh", to: "Suresh Singh" },
    ],
    source_records: {
      state_ror: {
        khewat_no: "88/90",
        khatauni_no: "145",
        khasra_no: "142/4",
        declared_area_sqm: 980,
        owner_name: "Suresh Singh",
        last_mutation_date: "2016-08-20",
      },
      cadastral_gis: {
        polygon_area_sqm: 980,
        perimeter_m: 125.0,
        centroid: [30.905, 75.865],
        srid: 4326,
        layer_name: "PB_Ludhiana_Cadastral_2026",
      },
      registration_ngdrs: {
        deed_number: "DEED-2016-LDH-1902",
        registration_date: "2016-08-20",
        registered_party: "Suresh Singh",
        encumbrance_status: "clear",
      },
      municipal_zoning: {
        zone_code: "ZONE-A1",
        permitted_use: "Agricultural (Chahi / Irrigated)",
        circle_rate_per_sqm: 2400,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-PB-2026-0043-ARREARS-PENDING",
      block_number: 104712,
      block_hash: "a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2",
      previous_hash: "1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a",
      merkle_root: "7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a",
      timestamp: "2024-11-15T08:15:00.000Z",
      signing_authority: "Directorate of Land Records & Revenue · Government of Punjab",
      jurisdiction: "Ludhiana East Sub-Division, Punjab",
      verification_status: "audit_pending",
    },
  },
  "PB-LDH-0044": {
    parcel_id: "PARCEL-PB-LDH-0044",
    ulpid: "PB-LDH-0044",
    ulpin: "PB-LDH-0044",
    survey_no: "142/5",
    khasra_no: "142/5",
    village: "Burj Littan",
    district: "Ludhiana",
    state: "Punjab",
    tehsil: "Ludhiana East",
    record_status: "Verified",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [75.84, 30.897],
          [75.849, 30.897],
          [75.849, 30.906],
          [75.84, 30.906],
          [75.84, 30.897],
        ],
      ],
    },
    owner: { name: "Harpreet Kaur", since: "2019-01-20", father_or_husband_name: "Gurpreet Singh" },
    area_sqm: 1180,
    ror_area_sqm: 1180,
    surveyed_area_sqm: 1180,
    land_use: "Commercial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 14500,
    tax_status: { paid: true, last_paid: "2026-02-10", dues: 0 },
    mutations: [
      { date: "2019-01-20", type: "Sale", from: "Punjab Land Board", to: "Harpreet Kaur" },
      { date: "2023-05-30", type: "Mortgage", from: "Harpreet Kaur", to: "State Bank of India" },
    ],
    ledger_receipt: {
      certificate_id: "CERT-PB-2026-0044-IMMUTABLE",
      block_number: 104880,
      block_hash: "5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c",
      previous_hash: "0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d",
      merkle_root: "9f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f8",
      timestamp: "2026-02-10T11:45:00.000Z",
      signing_authority: "Directorate of Land Records & Revenue · Government of Punjab",
      jurisdiction: "Ludhiana Central Commercial Registry, Punjab",
      verification_status: "verified_immutable",
    },
  },
  "PB-LDH-0045": {
    ulpid: "PB-LDH-0045",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [75.855, 30.912],
          [75.865, 30.912],
          [75.865, 30.919],
          [75.855, 30.919],
          [75.855, 30.912],
        ],
      ],
    },
    owner: { name: "Amanjot Bros. Pvt. Ltd.", since: "2020-09-11" },
    area_sqm: 4200,
    land_use: "Industrial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 11200,
    tax_status: { paid: true, last_paid: "2026-01-05", dues: 0 },
    mutations: [
      { date: "2020-09-11", type: "Sale", from: "State", to: "Amanjot Bros. Pvt. Ltd." },
    ],
    ledger_receipt: {
      certificate_id: "CERT-PB-2026-0045-IMMUTABLE",
      block_number: 104650,
      block_hash: "2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d",
      previous_hash: "8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b",
      merkle_root: "3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f",
      timestamp: "2026-01-05T09:20:00.000Z",
      signing_authority: "Directorate of Land Records & Revenue · Government of Punjab",
      jurisdiction: "Focal Point Industrial Zone, Ludhiana, Punjab",
      verification_status: "verified_immutable",
    },
  },

  // --- Chandigarh Pilot Parcels ---
  "CH-SEC-1701": {
    parcel_id: "PARCEL-CH-SEC-1701",
    ulpid: "CH-SEC-1701",
    ulpin: "CH-SEC-1701",
    survey_no: "SEC-17-P1",
    village: "Sector 17",
    district: "Chandigarh",
    state: "Chandigarh (UT)",
    record_status: "Verified",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [76.776, 30.731],
          [76.782, 30.731],
          [76.782, 30.736],
          [76.776, 30.736],
          [76.776, 30.731],
        ],
      ],
    },
    owner: { name: "Rajiv Walia & Associates", since: "2015-08-19" },
    area_sqm: 2400,
    ror_area_sqm: 2400,
    surveyed_area_sqm: 2400,
    land_use: "Commercial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 18500,
    tax_status: { paid: true, last_paid: "2026-02-28", dues: 0 },
    mutations: [
      { date: "2015-08-19", type: "Allotment", from: "UT Estate Office", to: "Rajiv Walia" },
    ],
    source_records: {
      state_ror: {
        khewat_no: "SEC17/01",
        khatauni_no: "101",
        khasra_no: "SEC-17-P1",
        declared_area_sqm: 2400,
        owner_name: "Rajiv Walia & Associates",
        last_mutation_date: "2015-08-19",
      },
      cadastral_gis: {
        polygon_area_sqm: 2400,
        perimeter_m: 200.0,
        centroid: [30.7335, 76.779],
        srid: 4326,
        layer_name: "CH_Sector17_Cadastral_2026",
      },
      registration_ngdrs: {
        deed_number: "DEED-2015-CH-1701",
        registration_date: "2015-08-19",
        registered_party: "Rajiv Walia & Associates",
        encumbrance_status: "clear",
      },
      municipal_zoning: {
        zone_code: "ZONE-C1",
        permitted_use: "Commercial Complex",
        circle_rate_per_sqm: 18500,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-CH-2026-1701-IMMUTABLE",
      block_number: 89410,
      block_hash: "7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b",
      previous_hash: "6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a",
      merkle_root: "a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9",
      timestamp: "2026-02-28T14:10:00.000Z",
      signing_authority: "Estate Office · Union Territory Administration, Chandigarh",
      jurisdiction: "Sector 17 Commercial Complex, Chandigarh (UT)",
      verification_status: "verified_immutable",
    },
  },
  "CH-SEC-1702": {
    parcel_id: "PARCEL-CH-SEC-1702",
    ulpid: "CH-SEC-1702",
    ulpin: "CH-SEC-1702",
    survey_no: "SEC-17-GB2",
    village: "Sector 17",
    district: "Chandigarh",
    state: "Chandigarh (UT)",
    record_status: "Needs Verification",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [76.783, 30.731],
          [76.791, 30.731],
          [76.791, 30.738],
          [76.783, 30.738],
          [76.783, 30.731],
        ],
      ],
    },
    owner: { name: "Chandigarh Urban Green Belt", since: "1966-11-01" },
    area_sqm: 6800,
    ror_area_sqm: 6800,
    surveyed_area_sqm: 6800,
    land_use: "Restriction Zone",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 1500,
    tax_status: { paid: true, last_paid: "2026-01-01", dues: 0 },
    mutations: [
      { date: "1966-11-01", type: "Gazette Notification", from: "Government", to: "Municipal Corporation" },
    ],
    source_records: {
      state_ror: {
        khewat_no: "GB-01",
        khatauni_no: "GB-01",
        khasra_no: "SEC-17-GB2",
        declared_area_sqm: 6800,
        owner_name: "Chandigarh Urban Green Belt",
        last_mutation_date: "1966-11-01",
      },
      cadastral_gis: {
        polygon_area_sqm: 6800,
        perimeter_m: 320.0,
        centroid: [30.7345, 76.787],
        srid: 4326,
        layer_name: "CH_Sector17_GreenBelt_2026",
      },
      registration_ngdrs: {
        deed_number: "DEED-1966-CH-GB2",
        registration_date: "1966-11-01",
        registered_party: "Municipal Corporation Chandigarh",
        encumbrance_status: "clear",
      },
      municipal_zoning: {
        zone_code: "ZONE-ENV",
        permitted_use: "Statutory Urban Green Reserve",
        circle_rate_per_sqm: 1500,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-CH-1966-1702-STATUTORY-PRESERVE",
      block_number: 102,
      block_hash: "b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8",
      previous_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      merkle_root: "4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f",
      timestamp: "1966-11-01T00:00:00.000Z",
      signing_authority: "Chief Administrator & Heritage Conservator · Chandigarh Administration",
      jurisdiction: "Protected Sector Green Belt Corridor, Chandigarh",
      verification_status: "verified_immutable",
    },
  },
  "CH-ITP-0301": {
    parcel_id: "PARCEL-CH-ITP-0301",
    ulpid: "CH-ITP-0301",
    ulpin: "CH-ITP-0301",
    survey_no: "ITP-301",
    village: "Kishangarh",
    district: "Chandigarh",
    state: "Chandigarh (UT)",
    record_status: "Needs Verification",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [76.774, 30.737],
          [76.781, 30.737],
          [76.781, 30.744],
          [76.774, 30.744],
          [76.774, 30.737],
        ],
      ],
    },
    owner: { name: "Horizon Infotech Hub", since: "2018-05-14" },
    area_sqm: 5100,
    ror_area_sqm: 5100,
    surveyed_area_sqm: 5100,
    land_use: "Industrial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 16800,
    tax_status: { paid: false, last_paid: "2025-06-12", dues: 14500 },
    mutations: [
      { date: "2018-05-14", type: "99-Yr Lease", from: "CH Chandigarh IT Park", to: "Horizon Infotech" },
    ],
    source_records: {
      state_ror: {
        khewat_no: "ITP/301",
        khatauni_no: "204",
        khasra_no: "ITP-301",
        declared_area_sqm: 5100,
        owner_name: "Horizon Infotech Hub",
        last_mutation_date: "2018-05-14",
      },
      cadastral_gis: {
        polygon_area_sqm: 5100,
        perimeter_m: 280.0,
        centroid: [30.7405, 76.7775],
        srid: 4326,
        layer_name: "CH_ITPark_Cadastral_2026",
      },
      registration_ngdrs: {
        deed_number: "DEED-2018-CH-ITP301",
        registration_date: "2018-05-14",
        registered_party: "Horizon Infotech Hub",
        encumbrance_status: "clear",
      },
      municipal_zoning: {
        zone_code: "ZONE-IT",
        permitted_use: "Technology & Software Park",
        circle_rate_per_sqm: 16800,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-CH-2026-0301-TAX-DEFAULT",
      block_number: 89350,
      block_hash: "e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0",
      previous_hash: "c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0",
      merkle_root: "8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d",
      timestamp: "2025-06-12T10:00:00.000Z",
      signing_authority: "Chandigarh Industrial & Tourism Development Corporation (CITCO)",
      jurisdiction: "Rajiv Gandhi Chandigarh Technology Park, Chandigarh",
      verification_status: "audit_pending",
    },
  },

  // --- Tamil Nadu (Sriperumbudur) Parcels ---
  "TN-SPR-0812": {
    parcel_id: "PARCEL-TN-SPR-0812",
    ulpid: "TN-SPR-0812",
    ulpin: "TN-SPR-0812",
    survey_no: "812/1",
    village: "Nemili",
    district: "Kanchipuram",
    state: "Tamil Nadu",
    record_status: "Verified",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [79.967, 12.978],
          [79.976, 12.978],
          [79.976, 12.985],
          [79.967, 12.985],
          [79.967, 12.978],
        ],
      ],
    },
    owner: { name: "Sundaram Component Works", since: "2014-03-22" },
    area_sqm: 7800,
    ror_area_sqm: 7800,
    surveyed_area_sqm: 7800,
    land_use: "Industrial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 9800,
    tax_status: { paid: true, last_paid: "2026-02-14", dues: 0 },
    mutations: [
      { date: "2014-03-22", type: "SIPCOT Allotment", from: "SIPCOT TN", to: "Sundaram Works" },
    ],
    source_records: {
      state_ror: {
        patta_no: "PATTA-SPR-812",
        khasra_no: "812/1",
        declared_area_sqm: 7800,
        owner_name: "Sundaram Component Works",
        last_mutation_date: "2014-03-22",
      },
      cadastral_gis: {
        polygon_area_sqm: 7800,
        perimeter_m: 350.0,
        centroid: [12.9815, 79.9715],
        srid: 4326,
        layer_name: "TN_Sriperumbudur_Cadastral_2026",
      },
      registration_ngdrs: {
        deed_number: "DEED-2014-TN-SPR812",
        registration_date: "2014-03-22",
        registered_party: "Sundaram Component Works",
        encumbrance_status: "clear",
      },
      municipal_zoning: {
        zone_code: "ZONE-IND",
        permitted_use: "SIPCOT Heavy Engineering Corridor",
        circle_rate_per_sqm: 9800,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-TN-2026-0812-IMMUTABLE",
      block_number: 142095,
      block_hash: "4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a",
      previous_hash: "f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89",
      merkle_root: "6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c",
      timestamp: "2026-02-14T09:30:00.000Z",
      signing_authority: "Department of Revenue and Disaster Management · Government of Tamil Nadu",
      jurisdiction: "Sriperumbudur Taluk, Kanchipuram District, Tamil Nadu",
      verification_status: "verified_immutable",
    },
  },
  "TN-SPR-0813": {
    parcel_id: "PARCEL-TN-SPR-0813",
    ulpid: "TN-SPR-0813",
    ulpin: "TN-SPR-0813",
    survey_no: "813/W",
    village: "Nemili",
    district: "Kanchipuram",
    state: "Tamil Nadu",
    record_status: "Needs Verification",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [79.977, 12.978],
          [79.986, 12.978],
          [79.986, 12.986],
          [79.977, 12.986],
          [79.977, 12.978],
        ],
      ],
    },
    owner: { name: "Sriperumbudur Wetland Catchment", since: "1984-01-01" },
    area_sqm: 14200,
    ror_area_sqm: 14200,
    surveyed_area_sqm: 14200,
    land_use: "Eco-Sensitive",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 1200,
    tax_status: { paid: true, last_paid: "2026-01-01", dues: 0 },
    mutations: [
      { date: "1984-01-01", type: "Wetland Protection Order", from: "PWD Tamil Nadu", to: "Protected Waters" },
    ],
    source_records: {
      state_ror: {
        patta_no: "PORAMBOKE-WATERBODY-813",
        khasra_no: "813/W",
        declared_area_sqm: 14200,
        owner_name: "Sriperumbudur Wetland Catchment",
        last_mutation_date: "1984-01-01",
      },
      cadastral_gis: {
        polygon_area_sqm: 14200,
        perimeter_m: 480.0,
        centroid: [12.982, 79.9815],
        srid: 4326,
        layer_name: "TN_Sriperumbudur_Wetland_2026",
      },
      registration_ngdrs: {
        deed_number: "GO-MS-1984-TN-PWD",
        registration_date: "1984-01-01",
        registered_party: "PWD Water Resources Dept",
        encumbrance_status: "clear",
      },
      municipal_zoning: {
        zone_code: "ZONE-CRZ-ECO",
        permitted_use: "Protected Eco-Sensitive Water Catchment",
        circle_rate_per_sqm: 1200,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-TN-1984-0813-WATERBODY-SANCTUARY",
      block_number: 1400,
      block_hash: "8a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f",
      previous_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      merkle_root: "9f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f8",
      timestamp: "1984-01-01T00:00:00.000Z",
      signing_authority: "Water Resources Department (PWD) · Government of Tamil Nadu",
      jurisdiction: "Sriperumbudur Lake Basin, Tamil Nadu",
      verification_status: "verified_immutable",
    },
  },
  "TN-SPR-0814": {
    parcel_id: "PARCEL-TN-SPR-0814",
    ulpid: "TN-SPR-0814",
    ulpin: "TN-SPR-0814",
    survey_no: "814/2B",
    village: "Nemili",
    district: "Kanchipuram",
    state: "Tamil Nadu",
    record_status: "Conflict Detected",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [79.968, 12.987],
          [79.977, 12.987],
          [79.977, 12.994],
          [79.968, 12.994],
          [79.968, 12.987],
        ],
      ],
    },
    owner: { name: "K. Venkatesan", since: "2008-11-10" },
    area_sqm: 3200,
    ror_area_sqm: 3450,
    surveyed_area_sqm: 3200,
    land_use: "Agricultural",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 2100,
    tax_status: { paid: false, last_paid: "2025-01-20", dues: 4800 },
    mutations: [
      { date: "2008-11-10", type: "Ancestral Patta", from: "Revenue Dept Kanchipuram", to: "K. Venkatesan" },
    ],
    source_records: {
      state_ror: {
        patta_no: "PATTA-SPR-814-2B",
        khasra_no: "814/2B",
        declared_area_sqm: 3450,
        owner_name: "K. Venkatesan",
        last_mutation_date: "2008-11-10",
      },
      cadastral_gis: {
        polygon_area_sqm: 3200,
        perimeter_m: 230.0,
        centroid: [12.9905, 79.9725],
        srid: 4326,
        layer_name: "TN_Sriperumbudur_Cadastral_2026",
      },
      registration_ngdrs: {
        deed_number: "DEED-2008-TN-SPR814",
        registration_date: "2008-11-10",
        registered_party: "K. Venkatesan (Heir)",
        encumbrance_status: "under_review",
      },
      municipal_zoning: {
        zone_code: "ZONE-AGRI",
        permitted_use: "Wetland Agricultural Buffer",
        circle_rate_per_sqm: 2100,
      },
    },
    ledger_receipt: {
      certificate_id: "CERT-TN-2026-0814-ARREARS-FLAGGED",
      block_number: 141920,
      block_hash: "c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6",
      previous_hash: "b0e9a1c5f3b7d8e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2",
      merkle_root: "e2a4c6b8d0e2f4a6c8b0d2e4f6a8b0c2d4e6f89f3a7c1e84d2b0e9a1c5f3b7d8",
      timestamp: "2025-01-20T12:00:00.000Z",
      signing_authority: "Tahsildar Office, Sriperumbudur · Government of Tamil Nadu",
      jurisdiction: "Sriperumbudur Rural Revenue Circle, Tamil Nadu",
      verification_status: "audit_pending",
    },
  },
};

// ==========================================
// 3. Conflict Records
// ==========================================
export const MOCK_CONFLICTS: Record<string, Conflict[]> = {
  "PB-LDH-0042": [
    {
      type: "area_mismatch",
      description: "RoR area (1250 sqm) does not match surveyed area (1180 sqm)",
      severity: "medium",
    },
  ],
  "PB-LDH-0043": [
    {
      type: "tax_dues",
      description: "Outstanding dues of ₹3,200 unresolved for over 12 months",
      severity: "low",
    },
    {
      type: "ownership_overlap",
      description: "Parcel boundary overlaps with adjacent ULPID PB-LDH-0044 by ~40 sqm",
      severity: "high",
    },
  ],
  "PB-LDH-0044": [],
  "PB-LDH-0045": [],
  "CH-SEC-1701": [],
  "CH-SEC-1702": [
    {
      type: "environmental_violation",
      description: "Satellite AI detected unauthorized concrete structure in designated Green Restriction Zone",
      severity: "high",
    },
  ],
  "CH-ITP-0301": [
    {
      type: "tax_arrears",
      description: "Pending property tax assessment notice ₹14,500",
      severity: "medium",
    },
  ],
  "TN-SPR-0812": [],
  "TN-SPR-0813": [
    {
      type: "waterbody_encroachment",
      description: "High-resolution satellite change detection flagged 180 sqm illegal fill into lake buffer zone",
      severity: "high",
    },
  ],
  "TN-SPR-0814": [
    {
      type: "agricultural_conversion",
      description: "Unpermitted earthwork detected on wet agricultural land without revenue conversion sanction",
      severity: "medium",
    },
  ],
};

// ==========================================
// 4. Multi-State Regional GeoJSON (Land Stack Layers)
// ==========================================
export const MOCK_REGIONAL_GEOJSON: Record<RegionId, GeoFeatureCollection> = {
  punjab: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          ulpid: "PB-LDH-0042",
          land_use: "Residential",
          zoning: "Residential",
          tax_band: "Band B (Standard Residential)",
          tax_arrears: false,
          owner_name: "Ramesh Kumar",
          area_sqm: 1250,
          rate_per_sqm: 6500,
          annual_tax: 8125,
        },
        geometry: MOCK_PARCELS["PB-LDH-0042"].geometry,
      },
      {
        type: "Feature",
        properties: {
          ulpid: "PB-LDH-0043",
          land_use: "Agricultural",
          zoning: "Agricultural",
          tax_band: "Band C (Agricultural/Rural)",
          tax_arrears: true,
          owner_name: "Suresh Singh",
          area_sqm: 980,
          rate_per_sqm: 2400,
          annual_tax: 2352,
        },
        geometry: MOCK_PARCELS["PB-LDH-0043"].geometry,
      },
      {
        type: "Feature",
        properties: {
          ulpid: "PB-LDH-0044",
          land_use: "Commercial",
          zoning: "Commercial",
          tax_band: "Band A (Prime Commercial)",
          tax_arrears: false,
          owner_name: "Harpreet Kaur",
          area_sqm: 1180,
          rate_per_sqm: 14500,
          annual_tax: 17110,
        },
        geometry: MOCK_PARCELS["PB-LDH-0044"].geometry,
      },
      {
        type: "Feature",
        properties: {
          ulpid: "PB-LDH-0045",
          land_use: "Industrial",
          zoning: "Industrial",
          tax_band: "Band A (Prime Commercial)",
          tax_arrears: false,
          owner_name: "Amanjot Bros. Pvt. Ltd.",
          area_sqm: 4200,
          rate_per_sqm: 11200,
          annual_tax: 47040,
        },
        geometry: MOCK_PARCELS["PB-LDH-0045"].geometry,
      },
    ],
  },

  chandigarh: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          ulpid: "CH-SEC-1701",
          land_use: "Commercial",
          zoning: "Commercial",
          tax_band: "Band A (Prime Commercial)",
          tax_arrears: false,
          owner_name: "Rajiv Walia & Associates",
          area_sqm: 2400,
          rate_per_sqm: 18500,
          annual_tax: 44400,
        },
        geometry: MOCK_PARCELS["CH-SEC-1701"].geometry,
      },
      {
        type: "Feature",
        properties: {
          ulpid: "CH-SEC-1702",
          land_use: "Restriction Zone",
          zoning: "Restriction Zone",
          tax_band: "Band C (Agricultural/Rural)",
          tax_arrears: false,
          owner_name: "Chandigarh Urban Green Belt",
          area_sqm: 6800,
          rate_per_sqm: 1500,
          annual_tax: 0,
        },
        geometry: MOCK_PARCELS["CH-SEC-1702"].geometry,
      },
      {
        type: "Feature",
        properties: {
          ulpid: "CH-ITP-0301",
          land_use: "Industrial",
          zoning: "Industrial",
          tax_band: "Band A (Prime Commercial)",
          tax_arrears: true,
          owner_name: "Horizon Infotech Hub",
          area_sqm: 5100,
          rate_per_sqm: 16800,
          annual_tax: 85680,
        },
        geometry: MOCK_PARCELS["CH-ITP-0301"].geometry,
      },
    ],
  },

  tamil_nadu: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          ulpid: "TN-SPR-0812",
          land_use: "Industrial",
          zoning: "Industrial",
          tax_band: "Band A (Prime Commercial)",
          tax_arrears: false,
          owner_name: "Sundaram Component Works",
          area_sqm: 7800,
          rate_per_sqm: 9800,
          annual_tax: 76440,
        },
        geometry: MOCK_PARCELS["TN-SPR-0812"].geometry,
      },
      {
        type: "Feature",
        properties: {
          ulpid: "TN-SPR-0813",
          land_use: "Eco-Sensitive",
          zoning: "Eco-Sensitive",
          tax_band: "Band C (Agricultural/Rural)",
          tax_arrears: false,
          owner_name: "Sriperumbudur Wetland Catchment",
          area_sqm: 14200,
          rate_per_sqm: 1200,
          annual_tax: 0,
        },
        geometry: MOCK_PARCELS["TN-SPR-0813"].geometry,
      },
      {
        type: "Feature",
        properties: {
          ulpid: "TN-SPR-0814",
          land_use: "Agricultural",
          zoning: "Agricultural",
          tax_band: "Band C (Agricultural/Rural)",
          tax_arrears: true,
          owner_name: "K. Venkatesan",
          area_sqm: 3200,
          rate_per_sqm: 2100,
          annual_tax: 6720,
        },
        geometry: MOCK_PARCELS["TN-SPR-0814"].geometry,
      },
    ],
  },
};

// Default fallback GeoJSON (Punjab)
export const MOCK_GEOJSON: GeoFeatureCollection = MOCK_REGIONAL_GEOJSON.punjab;

// Search index aggregated across all states
export const MOCK_SEARCH_INDEX: SearchResult[] = Object.values(MOCK_PARCELS).map((p) => ({
  ulpid: p.ulpid,
  name: p.owner.name,
  lat: (p.geometry.coordinates[0][0][1] + p.geometry.coordinates[0][2][1]) / 2,
  lng: (p.geometry.coordinates[0][0][0] + p.geometry.coordinates[0][2][0]) / 2,
}));

// ==========================================
// 5. AI/ML Encroachment Alerts (Neon Layers)
// ==========================================
export const MOCK_ENCROACHMENT_ALERTS: EncroachmentAlert[] = [
  {
    id: "ENC-PB-001",
    ulpid: "PB-LDH-0043",
    region_id: "punjab",
    confidence: 0.94,
    description: "Satellite Change Detection: Unauthorized 65 sqm plinth construction encroaching on village access pathway",
    area_sqm: 65,
    detected_date: "2026-09-02",
    severity: "high",
    type: "unauthorized_construction",
    coordinates: [
      [
        [75.867, 30.905],
        [75.871, 30.905],
        [75.871, 30.909],
        [75.867, 30.909],
        [75.867, 30.905],
      ],
    ],
  },
  {
    id: "ENC-PB-002",
    ulpid: "PB-LDH-0042",
    region_id: "punjab",
    confidence: 0.88,
    description: "Multi-temporal NDVI shift: Unapproved boundary expansion into public drainage buffer zone",
    area_sqm: 42,
    detected_date: "2026-08-25",
    severity: "medium",
    type: "boundary_push",
    coordinates: [
      [
        [75.857, 30.907],
        [75.860, 30.907],
        [75.860, 30.910],
        [75.857, 30.910],
        [75.857, 30.907],
      ],
    ],
  },
  {
    id: "ENC-CH-001",
    ulpid: "CH-SEC-1702",
    region_id: "chandigarh",
    confidence: 0.96,
    description: "Synthetic Aperture Radar Alert: 110 sqm paved parking encroachment inside protected Green Restriction Zone",
    area_sqm: 110,
    detected_date: "2026-09-10",
    severity: "high",
    type: "unauthorized_construction",
    coordinates: [
      [
        [76.786, 30.733],
        [76.790, 30.733],
        [76.790, 30.737],
        [76.786, 30.737],
        [76.786, 30.733],
      ],
    ],
  },
  {
    id: "ENC-TN-001",
    ulpid: "TN-SPR-0813",
    region_id: "tamil_nadu",
    confidence: 0.92,
    description: "Satellite Waterline Anomaly: 180 sqm illegal perimeter mud-bunding within Wetland Catchment Buffer",
    area_sqm: 180,
    detected_date: "2026-09-08",
    severity: "high",
    type: "eco_fringe_violation",
    coordinates: [
      [
        [79.980, 12.981],
        [79.985, 12.981],
        [79.985, 12.985],
        [79.980, 12.985],
        [79.980, 12.981],
      ],
    ],
  },
];

// ==========================================
// 6. Utility Infrastructure Networks with Explicit Safety Clearance Buffers
// ==========================================
export const MOCK_UTILITIES: UtilityLine[] = [
  // Punjab utilities
  {
    id: "UTL-PB-PWR",
    name: "66kV High Tension Power Corridor",
    region_id: "punjab",
    type: "power_grid",
    specification: "66kV Double Circuit Overhead Grid (15m Statutory No-Build Safety Zone)",
    voltage_or_flow: "66kV / 400 Ampere",
    safety_buffer_meters: 15,
    coordinates: [
      [30.895, 75.838],
      [30.902, 75.852],
      [30.908, 75.862],
      [30.916, 75.874],
    ],
    // Explicit geometric safety buffer corridor polygon (15m clearance envelope)
    buffer_polygon: [
      [30.896, 75.836],
      [30.903, 75.850],
      [30.909, 75.860],
      [30.917, 75.872],
      [30.915, 75.876],
      [30.907, 75.864],
      [30.901, 75.854],
      [30.894, 75.840],
      [30.896, 75.836],
    ],
  },
  {
    id: "UTL-PB-WTR",
    name: "Ludhiana Municipal Water Supply Trunk",
    region_id: "punjab",
    type: "water_main",
    specification: "900mm Ductile Iron Potable Transmission Duct",
    voltage_or_flow: "900mm Ø · 4.2 Bar Pressure",
    safety_buffer_meters: 5,
    coordinates: [
      [30.898, 75.845],
      [30.905, 75.856],
      [30.912, 75.865],
    ],
  },
  {
    id: "UTL-PB-DRN",
    name: "Buddha Nullah Drainage Buffer Canal",
    region_id: "punjab",
    type: "stormwater_drain",
    specification: "Protected Stormwater & Flood Overflow Drainage Basin",
    voltage_or_flow: "1,200 cusecs Peak Discharge",
    safety_buffer_meters: 10,
    coordinates: [
      [30.892, 75.848],
      [30.901, 75.859],
      [30.909, 75.870],
    ],
  },

  // Chandigarh utilities
  {
    id: "UTL-CH-PWR",
    name: "UT Underground HV Power Duct",
    region_id: "chandigarh",
    type: "power_grid",
    specification: "33kV Gas-Insulated Substation Underground Link",
    voltage_or_flow: "33kV GIS Cable Corridor",
    safety_buffer_meters: 10,
    coordinates: [
      [30.728, 76.772],
      [30.733, 76.780],
      [30.740, 76.788],
    ],
    buffer_polygon: [
      [30.729, 76.770],
      [30.734, 76.778],
      [30.741, 76.786],
      [30.739, 76.790],
      [30.732, 76.782],
      [30.727, 76.774],
      [30.729, 76.770],
    ],
  },
  {
    id: "UTL-CH-WTR",
    name: "Sukhna Lake Raw Water Feeder Line",
    region_id: "chandigarh",
    type: "water_main",
    specification: "1200mm Prestressed Concrete Conduit",
    voltage_or_flow: "1200mm PSC Trunk Main",
    safety_buffer_meters: 5,
    coordinates: [
      [30.730, 76.775],
      [30.735, 76.783],
      [30.742, 76.790],
    ],
  },

  // Tamil Nadu utilities
  {
    id: "UTL-TN-PWR",
    name: "TANGEDCO 230kV Sriperumbudur Industrial Grid",
    region_id: "tamil_nadu",
    type: "power_grid",
    specification: "230kV Extra High Voltage (EHV) Heavy Industrial Corridor (20m Statutory Clearance)",
    voltage_or_flow: "230kV Multi-Circuit Tower Link",
    safety_buffer_meters: 20,
    coordinates: [
      [12.972, 79.962],
      [12.980, 79.974],
      [12.988, 79.984],
    ],
    buffer_polygon: [
      [12.973, 79.960],
      [12.981, 79.972],
      [12.989, 79.982],
      [12.987, 79.986],
      [12.979, 79.976],
      [12.971, 79.964],
      [12.973, 79.960],
    ],
  },
  {
    id: "UTL-TN-DRN",
    name: "Chembarambakkam Lake Surplus Flood Canal",
    region_id: "tamil_nadu",
    type: "stormwater_drain",
    specification: "Major Surplus Flood Relief Course (Statutory No-Encroachment Buffer)",
    voltage_or_flow: "2,500 cusecs Wetland Inflow",
    safety_buffer_meters: 15,
    coordinates: [
      [12.975, 79.970],
      [12.982, 79.979],
      [12.991, 79.988],
    ],
  },
];

// ==========================================
// 7. Parcel-Centric Multi-Source Cross Reconciliation Data Provider
// ==========================================
export function getMockParcelReconciliation(ulpid: string): ParcelReconciliationReport {
  const parcel = MOCK_PARCELS[ulpid];
  const findings: ParcelReconciliationFinding[] = [];

  const surveyNo = parcel?.survey_no || "142/3";
  const ownerName = parcel?.owner?.name || "Ramesh Kumar";
  const village = parcel?.village || (ulpid.startsWith("PB") ? "Burj Littan" : ulpid.startsWith("TN") ? "Nemili" : "Sector 17");
  const district = parcel?.district || (ulpid.startsWith("PB") ? "Ludhiana" : ulpid.startsWith("TN") ? "Kanchipuram" : "Chandigarh");
  const state = parcel?.state || (ulpid.startsWith("PB") ? "Punjab" : ulpid.startsWith("TN") ? "Tamil Nadu" : "Chandigarh (UT)");

  // Compare RoR declared area vs Cadastral GIS calculated area
  const rorArea = parcel?.ror_area_sqm ?? (parcel?.source_records?.state_ror?.declared_area_sqm ?? parcel?.area_sqm ?? 1000);
  const gisArea = parcel?.surveyed_area_sqm ?? (parcel?.source_records?.cadastral_gis?.polygon_area_sqm ?? parcel?.area_sqm ?? 1000);
  const areaDiff = Math.abs(rorArea - gisArea);

  if (areaDiff > 0.01) {
    findings.push({
      field_compared: "Parcel Surface Extent (Area)",
      source_a_name: "State RoR (Jamabandi)",
      source_a_value: `${rorArea} sqm`,
      source_b_name: "Bhu-Naksha GIS Polygon (EPSG:4326)",
      source_b_value: `${gisArea} sqm`,
      difference: `${areaDiff} sqm variance`,
      reason: "Digitized ground cadastral polygon boundary differs from legacy paper Jamabandi extent.",
      severity: "medium",
      recommended_action: "review",
    });
  }

  // Compare Titleholder vs NGDRS Registered Party
  const deedParty = parcel?.source_records?.registration_ngdrs?.registered_party;
  if (deedParty && parcel?.owner?.name && deedParty.trim().toLowerCase() !== parcel.owner.name.trim().toLowerCase()) {
    findings.push({
      field_compared: "Registered Titleholder / Malik",
      source_a_name: "State RoR Record",
      source_a_value: parcel.owner.name,
      source_b_name: "NGDRS Registered Deed",
      source_b_value: deedParty,
      difference: `Title mismatch: "${parcel.owner.name}" vs "${deedParty}"`,
      reason: "Deed registration record holder differs from active revenue ledger, indicating possible unrecorded succession.",
      severity: "high",
      recommended_action: "review",
    });
  }

  // Encumbrance check
  const encumbrance = parcel?.source_records?.registration_ngdrs?.encumbrance_status;
  if (encumbrance === "under_review") {
    findings.push({
      field_compared: "Legal Encumbrance & Mutation Status",
      source_a_name: "NGDRS Sub-Registrar Registry",
      source_a_value: "Status: UNDER_REVIEW",
      source_b_name: "Revenue Department Workflow",
      source_b_value: "Pending Officer Adjudication",
      difference: "Active adjudication pending in revenue registry",
      reason: "Pending statutory boundary reconciliation or succession notice under officer review.",
      severity: "medium",
      recommended_action: "review",
    });
  }

  const recordStatus = parcel?.record_status || (findings.length > 0 ? "Conflict Detected" : "Verified");

  return {
    parcel_id: parcel?.parcel_id || `PARCEL-${ulpid}`,
    ulpid,
    ulpin: parcel?.ulpin || ulpid,
    survey_no: surveyNo,
    owner_name: ownerName,
    village,
    district,
    state,
    record_status: recordStatus,
    findings,
    has_conflicts: findings.length > 0,
    source_records: parcel?.source_records || {
      state_ror: {
        khasra_no: surveyNo,
        declared_area_sqm: rorArea,
        owner_name: ownerName,
      },
      cadastral_gis: {
        polygon_area_sqm: gisArea,
        perimeter_m: 140.0,
        srid: 4326,
      },
      registration_ngdrs: {
        deed_number: `DEED-AUTO-${ulpid}`,
        registration_date: "2020-01-01",
        registered_party: ownerName,
        encumbrance_status: "clear",
      },
      municipal_zoning: {
        zone_code: parcel?.land_use === "Commercial" ? "ZONE-C1" : "ZONE-R2",
        permitted_use: parcel?.land_use || "Residential",
        circle_rate_per_sqm: parcel?.rate_per_sqm || 6500,
      },
    },
    confidence_score: findings.length === 0 ? 0.95 : 0.82,
    disclaimer: "DEMO / SYNTHETIC DATA — Automated cross-reconciliation for hackathon demonstration. Authorized officials make final statutory determinations.",
  };
}
