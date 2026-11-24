import { describe, expect, it } from "vitest";

import {
  draftProposal,
  findNearDuplicate,
  jaccard,
} from "@/proposals/fingerprint";

describe("proposal fingerprints", () => {
  it("treats reordered wording as the same proposal", () => {
    const first = draftProposal("group projects in the sidebar");
    const second = draftProposal("sidebar grouping for projects");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.normalizedKey).toBe(second.normalizedKey);
    expect(jaccard(first.tokens, second.tokens)).toBe(1);
  });

  it("finds a near duplicate and rejects a different idea", () => {
    const draft = draftProposal("group the sidebar projects");
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    const existing = [
      { id: "1", tokens: ["group", "project", "sidebar", "folder"] },
      { id: "2", tokens: ["voice", "microphone"] },
    ];
    expect(findNearDuplicate(draft.tokens, existing)?.id).toBe("1");
    const other = draftProposal("offline voice dictation");
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(findNearDuplicate(other.tokens, existing)?.id).not.toBe("1");
  });

  it("rejects proposals that are too short", () => {
    expect(draftProposal("hi").ok).toBe(false);
    expect(draftProposal("a".repeat(201)).ok).toBe(false);
  });
});
