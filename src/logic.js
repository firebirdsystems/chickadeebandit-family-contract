/**
 * Pure business logic for the Family Contract app.
 * No DOM, no fetch — importable in both browser and test environments.
 */

export const STEP_TYPES = {
  video:       { label: "Watch a Video",      icon: "▶️",  bodyLabel: "Video URL",        bodyPlaceholder: "https://youtube.com/watch?v=..." },
  acknowledge: { label: "Read & Acknowledge", glyph: "book-open", bodyLabel: "Statement",        bodyPlaceholder: "I understand that a dog needs to be walked every day…" },
  commit:      { label: "Make a Commitment",  glyph: "signature", bodyLabel: "Commitment Prompt", bodyPlaceholder: "I commit to walking the dog every morning before school." },
  cost:        { label: "Review Costs",       glyph: "coins", bodyLabel: "Cost Breakdown",   bodyPlaceholder: "Food: ~$50/month\nVet visits: ~$200/year\nSupplies: ~$100 upfront" },
  other:       { label: "Other",              glyph: "checklist", bodyLabel: "Details",          bodyPlaceholder: "Describe what the child should do or understand for this step." },
};

export const STATUS_INFO = {
  draft:        { cls: "status-draft",        label: "Draft" },
  active:       { cls: "status-active",       label: "Active" },
  child_signed: { cls: "status-child-signed", label: "Awaiting Parent" },
  completed:    { cls: "status-completed",    label: "Completed" },
  voided:       { cls: "status-voided",       label: "Voided" },
};

export function stepsComplete(steps) {
  return steps.every(s => s.completed_at);
}

export function nextIncompleteStep(steps) {
  return steps.find(s => !s.completed_at) ?? null;
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * The description is the agreement — the title is a label for it.
 */
export function searchableFields(item) {
  return [item.title, item.description];
}

/**
 * The wording a contract's signatures are given to, as one string: the title,
 * the description, and each step's type, title and text, in order. What the
 * child typed or ticked while working through the steps is not part of it.
 * The same contract always gives the same string, whoever's screen builds it.
 */
export function contractTerms(contract, steps) {
  const ordered = [...steps].sort((a, b) =>
    (Number(a.position) - Number(b.position)) || String(a.id).localeCompare(String(b.id)));
  return JSON.stringify({
    title: contract.title ?? "",
    description: contract.description ?? "",
    steps: ordered.map(s => ({ type: s.type ?? "", title: s.title ?? "", body: s.body ?? "" })),
  });
}

/**
 * The wording to send, as the hub has it stored, with the contract's stamp
 * from BEFORE the steps were read. Every step write moves that stamp in its
 * own transaction, so a send that still finds this stamp is sending exactly
 * the steps read here. Read the other way round, a step saved between the two
 * reads would be missing from the wording and present under the stamp.
 * Null when the contract is no longer stored.
 */
export async function termsAsStored(readContract, readSteps) {
  const stored = await readContract();
  if (!stored) return null;
  const steps = await readSteps();
  return { stamp: stored.updated_at, terms: contractTerms(stored, steps) };
}

/**
 * What a contract's fingerprint column holds until it is sent. Never blank: a
 * signature given to a draft (the hub's agree endpoint does not know a draft
 * from a sent contract) is then bound to THIS, which no wording fingerprints
 * to, so the contract reads as changed and cannot be completed — rather than
 * being bound to a blank, which reads as "nothing was recorded".
 */
export const TERMS_UNSENT = "unsent";

/** A fingerprint of that wording (SHA-256, hex): what is stored and signed. */
export async function termsHash(terms) {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(terms));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The fingerprint on record for a contract: the one bound with the first
 * signature once anyone has signed, the one written when it was sent before
 * that. "" or null means nothing was recorded (sent before fingerprints).
 * TERMS_UNSENT is a real value here: on a contract that is in force it means a
 * signature was given before the contract was sent, and it matches no wording.
 */
export function recordedTermsHash(contract) {
  return (contract.child_agreed || contract.parent_agreed) ? contract.agreed_hash : contract.terms_hash;
}

/** True when the wording on screen is not the wording on record. */
export function termsChanged(contract, shownHash) {
  const recorded = recordedTermsHash(contract);
  return !!recorded && recorded !== shownHash;
}

/**
 * What a signer tells the hub they were shown (the agree endpoint's
 * `expected_snapshot`). The hub refuses the signature when it is not what is
 * on record. Where nothing is on record there is nothing to have been shown,
 * and the recorded blank is sent back so the signature is taken as before.
 */
export function shownTerms(contract, shownHash) {
  const recorded = recordedTermsHash(contract);
  return { terms_hash: recorded ? shownHash : (recorded ?? null) };
}
