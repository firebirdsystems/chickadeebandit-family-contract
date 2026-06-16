CREATE TABLE IF NOT EXISTS app_family_contract__contracts (
  id               TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  child_id         TEXT NOT NULL,
  created_by       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft',
  child_signed_at  TEXT,
  parent_signed_by TEXT,
  parent_signed_at TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS app_family_contract__contract_steps (
  id            TEXT NOT NULL,
  contract_id   TEXT NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  completed_by  TEXT,
  completed_at  TEXT,
  response      TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS contract_steps_contract_id
  ON app_family_contract__contract_steps (contract_id, position);

CREATE TABLE IF NOT EXISTS app_family_contract__activity (
  id            TEXT NOT NULL,
  contract_id   TEXT NOT NULL,
  actor_id      TEXT NOT NULL,
  action        TEXT NOT NULL,
  detail        TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  PRIMARY KEY (id)
);
