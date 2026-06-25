-- Move the agreement/lock state out of the party_scoped `contracts` table into a
-- dedicated endpoint_only table, mirroring the borrowing app's request_agreements.
--
-- WHY: `contracts` is party_scoped (child_id + created_by), which lets EITHER party
-- write ANY column of their row via /api/db. With the agreement flags (child_agreed,
-- parent_agreed) and the 'completed' status living on that row, a child could simply
-- `UPDATE contracts SET parent_agreed = 1, status = 'completed'` and forge the parent's
-- countersignature. The generic `agreements` hub mechanism only protects a table that
-- is endpoint_only — see APP_REVIEW_GUIDE §2.
--
-- FIX: `contract_agreements` (endpoint_only) is now the ONLY writer of the agreement
-- flags and lock state; the `api/agree` endpoint maps the caller's verified member id
-- to its own flag column and locks only when both parties have agreed. `contracts`
-- keeps the item-detail columns and the 'draft' / 'active' / 'voided' status values;
-- the 'completed' state is now DERIVED from contract_agreements.status = 'locked', so a
-- forged contracts.status is ignored. The old child_agreed / parent_agreed columns on
-- contracts are left in place (SQLite can't drop columns) but are now VESTIGIAL — the
-- client reads agreement state from contract_agreements via JOIN.

CREATE TABLE IF NOT EXISTS app_family_contract__contract_agreements (
  id            TEXT NOT NULL,                   -- same value as contracts.id
  child_id      TEXT NOT NULL,                   -- copied on init for party verification
  created_by    TEXT NOT NULL,
  child_agreed  INTEGER NOT NULL DEFAULT 0,
  parent_agreed INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'locked'
  locked_at     TEXT,
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (id)
);

-- contract_steps and activity rows are children of a contract. Give them the
-- contract's two parties so they can be party_scoped — only the child and the
-- creating parent may read or write them (previously any household member could
-- read a child's private commitments and tamper with steps).
ALTER TABLE app_family_contract__contract_steps ADD COLUMN child_id   TEXT NOT NULL DEFAULT '';
ALTER TABLE app_family_contract__contract_steps ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
ALTER TABLE app_family_contract__activity       ADD COLUMN child_id   TEXT NOT NULL DEFAULT '';
ALTER TABLE app_family_contract__activity       ADD COLUMN created_by TEXT NOT NULL DEFAULT '';

-- Backfill agreement state from the (now vestigial) contracts columns.
INSERT OR IGNORE INTO app_family_contract__contract_agreements
  (id, child_id, created_by, child_agreed, parent_agreed, status, locked_at, updated_at)
SELECT
  id,
  child_id,
  created_by,
  child_agreed,
  parent_agreed,
  CASE WHEN status = 'completed' THEN 'locked'        ELSE 'pending' END,
  CASE WHEN status = 'completed' THEN parent_signed_at ELSE NULL      END,
  updated_at
FROM app_family_contract__contracts;

-- Backfill the party columns on existing child rows from their parent contract.
UPDATE app_family_contract__contract_steps
   SET child_id   = (SELECT c.child_id   FROM app_family_contract__contracts c WHERE c.id = contract_id),
       created_by = (SELECT c.created_by FROM app_family_contract__contracts c WHERE c.id = contract_id)
 WHERE contract_id IN (SELECT id FROM app_family_contract__contracts);

UPDATE app_family_contract__activity
   SET child_id   = (SELECT c.child_id   FROM app_family_contract__contracts c WHERE c.id = contract_id),
       created_by = (SELECT c.created_by FROM app_family_contract__contracts c WHERE c.id = contract_id)
 WHERE contract_id IN (SELECT id FROM app_family_contract__contracts);
