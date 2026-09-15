-- Migration 003: Create Mutations Table with Audit Chaining and Foreign Keys
CREATE TABLE IF NOT EXISTS mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    ulpid VARCHAR(64) NOT NULL REFERENCES parcels(ulpid) ON DELETE CASCADE,
    mutation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mutation_type VARCHAR(100) NOT NULL,
    from_owner VARCHAR(255) NOT NULL DEFAULT '',
    to_owner VARCHAR(255) NOT NULL,
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_review')),
    officer_id VARCHAR(100) NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    audit_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for parcel mutations lookup and historical audit retrieval
CREATE INDEX IF NOT EXISTS idx_mutations_ulpid ON mutations (ulpid);
CREATE INDEX IF NOT EXISTS idx_mutations_parcel_id ON mutations (parcel_id);
CREATE INDEX IF NOT EXISTS idx_mutations_created_at ON mutations (created_at);
