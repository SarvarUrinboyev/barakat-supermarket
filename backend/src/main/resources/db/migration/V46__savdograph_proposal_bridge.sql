-- B3.5: identify the dedicated B2 simulation bridge and make it database-idempotent.
-- NULL keeps the frozen generic B1 proposal path unchanged; the bridge always
-- sets B2_REORDER_SIMULATION and is unique per tenant/source analysis run.
ALTER TABLE savdograph_decision_proposal
    ADD COLUMN source_kind VARCHAR(32);

ALTER TABLE savdograph_decision_proposal
    ADD CONSTRAINT ck_sg_proposal_source_kind
        CHECK (source_kind IS NULL OR source_kind = 'B2_REORDER_SIMULATION');

ALTER TABLE savdograph_decision_proposal
    ADD CONSTRAINT uq_sg_proposal_bridge_source
        UNIQUE (shop_id, analysis_run_id, source_kind);