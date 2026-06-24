ALTER TABLE app_family_contract__contracts ADD COLUMN child_agreed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_family_contract__contracts ADD COLUMN parent_agreed INTEGER NOT NULL DEFAULT 0;
