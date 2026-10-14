-- What the two parties signed.
--
-- A contract's wording (its title, description and each step's type, title and
-- text) lives on party-writable rows, and nothing recorded which wording a
-- signature was given to: either party could change a sent contract and the
-- signatures stayed on it.
--
-- `contracts.terms_hash` is a fingerprint of the wording, written by the
-- creating parent when the contract is sent. The hub copies it into the
-- endpoint_only agreement row with the first signature (agreements
-- .snapshot_columns), and each signer states the fingerprint of what their
-- screen showed, so a signature can only be given to the wording that was sent.
--
-- A fingerprint, not the wording: the agreement table is readable by the whole
-- household, and a contract is private to the child and the parent.
--
-- Contracts sent before this migration keep '' (and NULL once signed): nothing
-- is recorded for them, and they sign as they did before.
--
-- A contract not yet sent holds 'unsent' (see TERMS_UNSENT in src/logic.js),
-- never '': the hub's agree endpoint does not know a draft from a sent
-- contract, and a signature given to a draft must bind something no wording
-- fingerprints to, not the blank that reads as "nothing was recorded".
ALTER TABLE app_family_contract__contracts ADD COLUMN terms_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE app_family_contract__contract_agreements ADD COLUMN terms_hash TEXT;
UPDATE app_family_contract__contracts SET terms_hash = 'unsent' WHERE status = 'draft';
