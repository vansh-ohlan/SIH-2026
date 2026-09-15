import {
  Parcel,
  SearchResult,
  Conflict,
  GeoFeatureCollection,
  PilotRegion,
  RegionId,
  EncroachmentAlert,
  UtilityLine,
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
    ulpid: "PB-LDH-0042",
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
    owner: { name: "Ramesh Kumar", since: "2011-04-12" },
    area_sqm: 1250,
    land_use: "Residential",
    valuation_band: "Band B (Standard Residential)",
    rate_per_sqm: 6500,
    tax_status: { paid: true, last_paid: "2026-03-01", dues: 0 },
    mutations: [
      { date: "2011-04-12", type: "Sale", from: "State", to: "Ramesh Kumar" },
    ],
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
    ulpid: "PB-LDH-0043",
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
    owner: { name: "Suresh Singh", since: "2016-07-02" },
    area_sqm: 980,
    land_use: "Agricultural",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 2400,
    tax_status: { paid: false, last_paid: "2024-11-15", dues: 3200 },
    mutations: [
      { date: "2016-07-02", type: "Inheritance", from: "Gurdev Singh", to: "Suresh Singh" },
    ],
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
    ulpid: "PB-LDH-0044",
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
    owner: { name: "Harpreet Kaur", since: "2019-01-20" },
    area_sqm: 1180,
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
    ulpid: "CH-SEC-1701",
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
    land_use: "Commercial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 18500,
    tax_status: { paid: true, last_paid: "2026-02-28", dues: 0 },
    mutations: [
      { date: "2015-08-19", type: "Allotment", from: "UT Estate Office", to: "Rajiv Walia" },
    ],
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
    ulpid: "CH-SEC-1702",
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
    land_use: "Restriction Zone",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 1500,
    tax_status: { paid: true, last_paid: "2026-01-01", dues: 0 },
    mutations: [
      { date: "1966-11-01", type: "Gazette Notification", from: "Government", to: "Municipal Corporation" },
    ],
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
    ulpid: "CH-ITP-0301",
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
    land_use: "Industrial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 16800,
    tax_status: { paid: false, last_paid: "2025-06-12", dues: 14500 },
    mutations: [
      { date: "2018-05-14", type: "99-Yr Lease", from: "CH Chandigarh IT Park", to: "Horizon Infotech" },
    ],
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
    ulpid: "TN-SPR-0812",
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
    land_use: "Industrial",
    valuation_band: "Band A (Prime Commercial)",
    rate_per_sqm: 9800,
    tax_status: { paid: true, last_paid: "2026-02-14", dues: 0 },
    mutations: [
      { date: "2014-03-22", type: "SIPCOT Allotment", from: "SIPCOT TN", to: "Sundaram Works" },
    ],
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
    ulpid: "TN-SPR-0813",
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
    land_use: "Eco-Sensitive",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 1200,
    tax_status: { paid: true, last_paid: "2026-01-01", dues: 0 },
    mutations: [
      { date: "1984-01-01", type: "Wetland Protection Order", from: "PWD Tamil Nadu", to: "Protected Waters" },
    ],
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
    ulpid: "TN-SPR-0814",
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
    land_use: "Agricultural",
    valuation_band: "Band C (Agricultural/Rural)",
    rate_per_sqm: 2100,
    tax_status: { paid: false, last_paid: "2025-01-20", dues: 4800 },
    mutations: [
      { date: "2008-11-10", type: "Ancestral Patta", from: "Revenue Dept Kanchipuram", to: "K. Venkatesan" },
    ],
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
