import { describe, expect, it } from "vitest";

import { findNearDuplicate } from "../../../src/proposals/fingerprint";
import { draftPost } from "../../../src/posts/draft";
import { tokenize } from "../../../src/text/tokens";
import {
  compareCursor,
  cursorAfterFinished,
  ingestPlan,
  parseIngestClassifications,
  pendingSince,
  stepCursor,
} from "../../../src/jobs/ingest";

const CLASSIFIED = JSON.stringify({
  items: [
    {
      sourceId: "github:issue:1",
      featureRequest: true,
      title: "Remember window size per project",
      description: "Restore the last editor width when switching projects.",
    },
    {
      sourceId: "x:2",
      featureRequest: false,
      title: "",
      description: "",
    },
    {
      sourceId: "github:issue:3",
      featureRequest: true,
      title: "Hi",
      description: "Too short to be a request.",
    },
  ],
});

describe("ingest classification", () => {
  it("keeps feature requests that normalize and drops the rest", () => {
    const items = parseIngestClassifications(CLASSIFIED);
    expect(items).toEqual([
      {
        sourceId: "github:issue:1",
        featureRequest: true,
        title: "Remember window size per project",
        description: "Restore the last editor width when switching projects.",
      },
      {
        sourceId: "x:2",
        featureRequest: false,
        title: "",
        description: "",
      },
    ]);
    expect(parseIngestClassifications("not json")).toEqual([]);
  });
});

describe("ingest dedup", () => {
  it("links a near duplicate and skips a source that was already stored", () => {
    const draft = draftPost(
      "Remember window size per project",
      "Restore the last editor width when switching projects.",
    );
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    const duplicate = findNearDuplicate(draft.tokens, [
      {
        id: "post-1",
        tokens: tokenize(
          "Remember window size per project Restore the last editor width when switching projects.",
        ),
      },
      { id: "post-2", tokens: tokenize("collapse the file tree") },
    ]);
    expect(ingestPlan(false, duplicate?.id ?? null)).toBe("link");
    expect(ingestPlan(true, duplicate?.id ?? null)).toBe("skip");
    const fresh = findNearDuplicate(
      tokenize("export the chat transcript as markdown"),
      [{ id: "post-1", tokens: draft.tokens }],
    );
    expect(ingestPlan(false, fresh?.id ?? null)).toBe("create");
  });
});

describe("ingest cursors", () => {
  it("walks forward only after the whole batch is stored", () => {
    const batch = pendingSince(
      [
        { id: "a", cursor: "2026-11-01T00:00:00.000Z" },
        { id: "b", cursor: "2026-11-03T00:00:00.000Z" },
        { id: "c", cursor: "2026-11-02T00:00:00.000Z" },
      ],
      "2026-11-01T00:00:00.000Z",
      2,
    );
    expect(batch.map((item) => item.id)).toEqual(["c", "b"]);
    expect(
      cursorAfterFinished([
        { cursor: "2026-11-02T00:00:00.000Z", finished: true },
        { cursor: "2026-11-03T00:00:00.000Z", finished: false },
      ]),
    ).toBeNull();
    expect(
      stepCursor(
        cursorAfterFinished([
          { cursor: "2026-11-02T00:00:00.000Z", finished: true },
          { cursor: "2026-11-03T00:00:00.000Z", finished: true },
        ]) ?? "",
      ),
    ).toBe("2026-11-03T00:00:00.001Z");
    expect(compareCursor("99", "100")).toBe(-1);
    expect(stepCursor("100")).toBe("100");
  });
});
