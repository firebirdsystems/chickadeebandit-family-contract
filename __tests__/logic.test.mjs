import { describe, it, expect } from "vitest";
import { STEP_TYPES, STATUS_INFO, stepsComplete, nextIncompleteStep, formatDate, searchableFields, contractTerms, termsAsStored, termsHash, recordedTermsHash, termsChanged, shownTerms, TERMS_UNSENT } from "../src/logic.js";

describe("stepsComplete", () => {
  it("returns true when all steps have completed_at", () => {
    const steps = [
      { id: "1", completed_at: "2024-01-01T00:00:00Z" },
      { id: "2", completed_at: "2024-01-02T00:00:00Z" },
    ];
    expect(stepsComplete(steps)).toBe(true);
  });

  it("returns false when any step is incomplete", () => {
    const steps = [
      { id: "1", completed_at: "2024-01-01T00:00:00Z" },
      { id: "2", completed_at: null },
    ];
    expect(stepsComplete(steps)).toBe(false);
  });

  it("returns true for empty step list", () => {
    expect(stepsComplete([])).toBe(true);
  });
});

describe("nextIncompleteStep", () => {
  it("returns first step with no completed_at", () => {
    const steps = [
      { id: "1", completed_at: "2024-01-01T00:00:00Z" },
      { id: "2", completed_at: null },
      { id: "3", completed_at: null },
    ];
    expect(nextIncompleteStep(steps)?.id).toBe("2");
  });

  it("returns null when all steps complete", () => {
    const steps = [{ id: "1", completed_at: "2024-01-01T00:00:00Z" }];
    expect(nextIncompleteStep(steps)).toBeNull();
  });
});

describe("STEP_TYPES", () => {
  it("has all five types", () => {
    expect(Object.keys(STEP_TYPES)).toEqual(["video", "acknowledge", "commit", "cost", "other"]);
  });
});

describe("STATUS_INFO", () => {
  it("covers all five statuses", () => {
    const statuses = ["draft", "active", "child_signed", "completed", "voided"];
    for (const s of statuses) {
      expect(STATUS_INFO[s]).toBeDefined();
    }
  });
});

describe("searchableFields", () => {
  it("matches on the description — the agreement itself, not its label", () => {
    expect(searchableFields({ title: "Phone rules", description: "no screens after 9pm on school nights" }))
      .toContain("no screens after 9pm on school nights");
  });
});

describe("the wording a contract's signatures are given to", () => {
  const contract = { title: "A dog", description: "Before we get one" };
  const steps = [
    { id: "b", position: 1, type: "cost", title: "Costs", body: "Food: $50", completed_at: null, response: "" },
    { id: "a", position: 0, type: "commit", title: "Walks", body: "Every morning", completed_at: null, response: "" },
  ];

  it("is the same string whatever order the steps arrive in, and whatever the child has done", () => {
    const done = steps.map(s => ({ ...s, completed_at: "done", completed_by: "kid", response: "I will" }));
    expect(contractTerms(contract, [...steps].reverse())).toBe(contractTerms(contract, steps));
    expect(contractTerms(contract, done)).toBe(contractTerms(contract, steps));
    expect(JSON.parse(contractTerms(contract, steps)).steps.map(s => s.title)).toEqual(["Walks", "Costs"]);
  });

  it("changes when any wording does: title, description, a step's type, title or text, a step added or removed", () => {
    const base = contractTerms(contract, steps);
    const edit = (i, patch) => steps.map((s, n) => n === i ? { ...s, ...patch } : s);
    for (const other of [
      contractTerms({ ...contract, title: "A cat" }, steps),
      contractTerms({ ...contract, description: "" }, steps),
      contractTerms(contract, edit(0, { type: "other" })),
      contractTerms(contract, edit(0, { title: "Bills" })),
      contractTerms(contract, edit(1, { body: "Every evening" })),
      contractTerms(contract, steps.slice(1)),
      contractTerms(contract, [...steps, { id: "c", position: 2, type: "other", title: "More", body: "" }]),
      contractTerms(contract, steps.map(s => ({ ...s, position: 1 - s.position }))),
    ]) expect(other).not.toBe(base);
  });

  it("fingerprints to 64 hex characters, the same for the same wording", async () => {
    const hash = await termsHash(contractTerms(contract, steps));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await termsHash(contractTerms(contract, [...steps].reverse()))).toBe(hash);
    expect(await termsHash(contractTerms({ ...contract, title: "A cat" }, steps))).not.toBe(hash);
  });
});

describe("the fingerprint on record, and what a signer says they were shown", () => {
  it("is the sent fingerprint until someone signs, the bound one after", () => {
    expect(recordedTermsHash({ terms_hash: "sent", agreed_hash: null, child_agreed: false, parent_agreed: false })).toBe("sent");
    expect(recordedTermsHash({ terms_hash: "edited", agreed_hash: "sent", child_agreed: true, parent_agreed: false })).toBe("sent");
  });

  it("a signer states what their screen showed whenever a fingerprint is on record", () => {
    const sent = { terms_hash: "sent", agreed_hash: null, child_agreed: false, parent_agreed: false };
    expect(shownTerms(sent, "sent")).toEqual({ terms_hash: "sent" });
    // Not the recorded value: the screen's own, so the hub can refuse it.
    expect(shownTerms(sent, "other")).toEqual({ terms_hash: "other" });
    expect(termsChanged(sent, "other")).toBe(true);
    expect(termsChanged(sent, "sent")).toBe(false);
    const signed = { terms_hash: "edited", agreed_hash: "sent", child_agreed: true, parent_agreed: false };
    expect(shownTerms(signed, "edited")).toEqual({ terms_hash: "edited" });
    expect(termsChanged(signed, "edited")).toBe(true);
  });

  it("a contract sent before fingerprints signs as it did: the recorded blank is sent back, and nothing reads as changed", () => {
    const unsigned = { terms_hash: "", agreed_hash: null, child_agreed: false, parent_agreed: false };
    expect(shownTerms(unsigned, "anything")).toEqual({ terms_hash: "" });
    expect(termsChanged(unsigned, "anything")).toBe(false);
    // Signed by the child before the column existed: the agreement row holds NULL.
    const half = { terms_hash: "", agreed_hash: null, child_agreed: true, parent_agreed: false };
    expect(shownTerms(half, "anything")).toEqual({ terms_hash: null });
    expect(termsChanged(half, "anything")).toBe(false);
  });
});

describe("a signature given before the contract was sent", () => {
  it("is bound to a marker no wording fingerprints to, so the contract reads as changed and the screen's own fingerprint is what is stated", async () => {
    expect(TERMS_UNSENT).not.toBe("");
    expect(TERMS_UNSENT).not.toMatch(/^[0-9a-f]{64}$/);
    // The child signed the draft directly; the parent has since sent it.
    const sent = { terms_hash: "real", agreed_hash: TERMS_UNSENT, child_agreed: true, parent_agreed: false };
    expect(termsChanged(sent, "real")).toBe(true);
    expect(shownTerms(sent, "real")).toEqual({ terms_hash: "real" });
  });
});

describe("the wording read for sending", () => {
  it("takes the contract's stamp before the steps, so a step saved in between moves the stamp the send is guarded by", async () => {
    const order = [];
    const read = await termsAsStored(
      async () => { order.push("contract"); return { title: "T", description: "D", updated_at: "stamp-1" }; },
      async () => { order.push("steps"); return [{ id: "s1", position: 0, type: "rule", title: "A", body: "B" }]; },
    );
    expect(order).toEqual(["contract", "steps"]);
    expect(read.stamp).toBe("stamp-1");
    expect(read.terms).toBe(contractTerms({ title: "T", description: "D" }, [{ id: "s1", position: 0, type: "rule", title: "A", body: "B" }]));
  });

  it("is nothing when the contract is no longer stored, and the steps are not read", async () => {
    let stepsRead = false;
    expect(await termsAsStored(async () => undefined, async () => { stepsRead = true; return []; })).toBeNull();
    expect(stepsRead).toBe(false);
  });
});
