import { describe, it, expect } from "vitest";
import { STEP_TYPES, STATUS_INFO, stepsComplete, nextIncompleteStep, formatDate } from "../src/logic.js";

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
