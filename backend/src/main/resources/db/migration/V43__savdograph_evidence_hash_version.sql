-- B1.1: make the evidence hash algorithm version explicit. Existing B1 rows
-- remain readable but are deliberately marked legacy; new B1.1 evidence uses
-- B1_CANONICAL_V1 and is the only evidence accepted for newly created proposals.
ALTER TABLE savdograph_evidence_item
    ADD COLUMN hash_version VARCHAR(32) NOT NULL DEFAULT 'B1_LEGACY';

ALTER TABLE savdograph_evidence_item
    ADD CONSTRAINT ck_sg_evidence_hash_version
        CHECK (hash_version IN ('B1_LEGACY', 'B1_CANONICAL_V1'));
