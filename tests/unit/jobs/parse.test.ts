import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPENROUTER_MODEL,
  resolveOpenRouterModel,
  shouldCallOpenRouter,
} from "../../../src/jobs/model";
import {
  isReleaseNoise,
  parseCatalogRewrites,
  parseDigest,
  parseEnrichment,
  releaseVersion,
} from "../../../src/jobs/parse";
import { matchShipped } from "../../../src/jobs/shipped";

describe("openrouter model", () => {
  it("defaults to gpt-6 luna and skips calls without a key", () => {
    expect(DEFAULT_OPENROUTER_MODEL).toBe("openai/gpt-6-luna");
    expect(resolveOpenRouterModel(undefined)).toBe("openai/gpt-6-luna");
    expect(resolveOpenRouterModel("  openai/gpt-5.6-luna  ")).toBe(
      "openai/gpt-5.6-luna",
    );
    expect(shouldCallOpenRouter(undefined)).toBe(false);
    expect(shouldCallOpenRouter("   ")).toBe(false);
    expect(shouldCallOpenRouter("key")).toBe(true);
  });
});

describe("background parsers", () => {
  it("parses enrichment and ignores an unknown category", () => {
    expect(
      parseEnrichment(
        'note {"normalizedTitle":"Group projects","category":"sidebar","duplicateIds":["p1"]}',
      ),
    ).toEqual({
      normalizedTitle: "Group projects",
      category: "sidebar",
      duplicateIds: ["p1"],
    });
    expect(
      parseEnrichment(
        '{"normalizedTitle":"Hi","category":"roadmap","duplicateIds":[]}',
      ),
    ).toBeNull();
  });

  it("parses a digest and catalog rewrites", () => {
    expect(
      parseDigest(
        '{"summary":"People want a quieter sidebar.","themes":["sidebar"]}',
      ),
    ).toEqual({
      summary: "People want a quieter sidebar.",
      themes: ["sidebar"],
    });
    expect(
      parseCatalogRewrites(
        '{"items":[{"sourceId":"release:1","summary":"Drafts survive reload"}]}',
      ),
    ).toEqual([{ sourceId: "release:1", summary: "Drafts survive reload" }]);
  });

  it("drops test and chore lines and reads a version", () => {
    expect(isReleaseNoise("chore: bump deps")).toBe(true);
    expect(isReleaseNoise("Review drafts. Comments survive reload.")).toBe(
      false,
    );
    expect(releaseVersion("Release v0.1.12-nightly.20261124.5191")).toBe(
      "v0.1.12-nightly.20261124.5191",
    );
  });
});

describe("shipped matching", () => {
  it("flags a request that restates a shipped line", () => {
    const hit = matchShipped(
      {
        title: "Pending review comments survive reload",
        description:
          "Draft pull request comments should stay after the window closes.",
      },
      [
        {
          id: "release:1",
          title:
            "Pending pull request comments and review summaries survive a reload",
          summary:
            "Pending pull request comments and review summaries survive a reload",
          version: "v0.1.12",
        },
      ],
    );
    expect(hit?.version).toBe("v0.1.12");
  });

  it("leaves an unrelated request alone", () => {
    expect(
      matchShipped(
        {
          title: "Group projects in the sidebar",
          description: "Cluster repositories in the sidebar.",
        },
        [
          {
            id: "release:1",
            title: "Pending pull request comments survive a reload",
            summary: "Review drafts stay after reload",
            version: "v0.1.12",
          },
        ],
      ),
    ).toBeNull();
  });
});
