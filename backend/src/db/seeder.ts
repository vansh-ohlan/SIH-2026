import { db } from './pool';
import { generateAuditHash, GENESIS_HASH } from '../audit/hashChain';
import { logger } from '../utils/logger';

export interface SeedParcelData {
  ulpid: string;
  owner_name: string;
  owner_since: string;
  area_sqm: number;
  land_use: string;
  tax_paid: boolean;
  tax_last_paid: string;
  tax_dues: number;
  ror_area_sqm: number;
  surveyed_area_sqm: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  mutations: Array<{
    date: string;
    type: string;
    from: string;
    to: string;
    decision: 'approved' | 'rejected' | 'needs_review';
    officer_id: string;
    notes: string;
  }>;
}

export const SYNTHETIC_SEED_PARCELS: SeedParcelData[] = [
  {
    ulpid: 'PB-LDH-0042',
    owner_name: 'Ramesh Kumar',
    owner_since: '2011-04-12',
    area_sqm: 1250,
    land_use: 'Residential',
    tax_paid: true,
    tax_last_paid: '2026-03-01',
    tax_dues: 0,
    ror_area_sqm: 1250,
    surveyed_area_sqm: 1180, // Area mismatch for demo conflict detection
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [75.85, 30.90],
          [75.86, 30.90],
          [75.86, 30.91],
          [75.85, 30.91],
          [75.85, 30.90]
        ]
      ]
    },
    mutations: [
      {
        date: '2011-04-12',
        type: 'Sale',
        from: 'State',
        to: 'Ramesh Kumar',
        decision: 'approved',
        officer_id: 'OFF-101',
        notes: 'Initial land registration and state grant'
      }
    ]
  },
  {
    ulpid: 'PB-LDH-0043',
    owner_name: 'Suresh Singh',
    owner_since: '2018-09-20',
    area_sqm: 980,
    land_use: 'Commercial',
    tax_paid: true,
    tax_last_paid: '2026-02-15',
    tax_dues: 0,
    ror_area_sqm: 980,
    surveyed_area_sqm: 980,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [75.86, 30.90],
          [75.87, 30.90],
          [75.87, 30.91],
          [75.86, 30.91],
          [75.86, 30.90]
        ]
      ]
    },
    mutations: [
      {
        date: '2018-09-20',
        type: 'Inheritance',
        from: 'Gurdev Singh',
        to: 'Suresh Singh',
        decision: 'approved',
        officer_id: 'OFF-100',
        notes: 'Ancestral mutation approved'
      }
    ]
  },
  {
    ulpid: 'PB-LDH-0044',
    owner_name: 'Priya Sharma',
    owner_since: '2020-01-10',
    area_sqm: 1500,
    land_use: 'Agricultural',
    tax_paid: true,
    tax_last_paid: '2026-01-05',
    tax_dues: 0,
    ror_area_sqm: 1500,
    surveyed_area_sqm: 1500,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [75.87, 30.90],
          [75.88, 30.90],
          [75.88, 30.91],
          [75.87, 30.91],
          [75.87, 30.90]
        ]
      ]
    },
    mutations: [
      {
        date: '2020-01-10',
        type: 'Sale',
        from: 'Harpreet Kaur',
        to: 'Priya Sharma',
        decision: 'approved',
        officer_id: 'OFF-102',
        notes: 'Registered deed verification'
      }
    ]
  }
];

export async function seedDatabase(): Promise<void> {
  logger.info('Seeding database with synthetic demo land records...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    for (const parcel of SYNTHETIC_SEED_PARCELS) {
      // Upsert parcel record using PostGIS ST_GeomFromGeoJSON
      const parcelRes = await client.query<{ id: string }>(
        `
        INSERT INTO parcels (
          ulpid, owner_name, owner_since, area_sqm, land_use,
          tax_paid, tax_last_paid, tax_dues, ror_area_sqm, surveyed_area_sqm,
          geometry, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          ST_SetSRID(ST_GeomFromGeoJSON($11), 4326), NOW()
        )
        ON CONFLICT (ulpid) DO UPDATE SET
          owner_name = EXCLUDED.owner_name,
          owner_since = EXCLUDED.owner_since,
          area_sqm = EXCLUDED.area_sqm,
          land_use = EXCLUDED.land_use,
          tax_paid = EXCLUDED.tax_paid,
          tax_last_paid = EXCLUDED.tax_last_paid,
          tax_dues = EXCLUDED.tax_dues,
          ror_area_sqm = EXCLUDED.ror_area_sqm,
          surveyed_area_sqm = EXCLUDED.surveyed_area_sqm,
          geometry = EXCLUDED.geometry,
          updated_at = NOW()
        RETURNING id;
        `,
        [
          parcel.ulpid,
          parcel.owner_name,
          parcel.owner_since,
          parcel.area_sqm,
          parcel.land_use,
          parcel.tax_paid,
          parcel.tax_last_paid,
          parcel.tax_dues,
          parcel.ror_area_sqm,
          parcel.surveyed_area_sqm,
          JSON.stringify(parcel.geometry)
        ]
      );

      const parcelId = parcelRes.rows[0].id;

      // Seed mutation history
      let previousHash = GENESIS_HASH;
      for (const m of parcel.mutations) {
        const timestamp = `${m.date}T10:00:00.000Z`;
        const auditHash = generateAuditHash({
          ulpid: parcel.ulpid,
          decision: m.decision,
          officer_id: m.officer_id,
          notes: m.notes,
          timestamp,
          previous_hash: previousHash
        });

        // Insert historical mutation if not already existing
        await client.query(
          `
          INSERT INTO mutations (
            parcel_id, ulpid, mutation_date, mutation_type,
            from_owner, to_owner, decision, officer_id,
            notes, audit_hash, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT DO NOTHING;
          `,
          [
            parcelId,
            parcel.ulpid,
            m.date,
            m.type,
            m.from,
            m.to,
            m.decision,
            m.officer_id,
            m.notes,
            auditHash,
            timestamp
          ]
        );

        previousHash = auditHash;
      }
    }

    await client.query('COMMIT');
    logger.info(`Successfully seeded ${SYNTHETIC_SEED_PARCELS.length} demo parcels with mutations.`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to seed database', { error: (error as Error).message });
    throw error;
  } finally {
    client.release();
  }
}
