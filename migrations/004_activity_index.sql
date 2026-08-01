-- `activity` is read per contract and had no index; `contract_steps` was the
-- only indexed child table.
CREATE INDEX IF NOT EXISTS app_family_contract__activity_contract_idx
  ON app_family_contract__activity (contract_id, created_at);
