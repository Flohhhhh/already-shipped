import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  matchPercent,
  searchFeatures,
  searchWithVectors,
  withPickedMatch,
} from "@/server/search/match";
import type { FeatureEntry, FeatureIndex } from "@/server/search/types";

const boring: FeatureEntry = {
  id: "setting:boring-sidebar",
  title: "Boring sidebar (group by project)",
  summary: "Turn on Settings → Labs → Boring sidebar (group by project).",
  where: "Settings, then Labs",
  kind: "setting",
  terms: ["beta folders project tree classic sidebar"],
  sources: [
    {
      url: "https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/settings/settingsSearch.ts",
      label: "Setting definition",
    },
  ],
};

const projectGrouping: FeatureEntry = {
  id: "setting:project-grouping",
  title: "Project grouping",
  summary: "Combine matching repositories across environments.",
  where: "Settings, then General",
  kind: "setting",
  terms: ["combine matching repositories environments sidebar"],
  sources: [
    {
      url: "https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/settings/settingsSearch.ts",
      label: "Setting definition",
    },
  ],
};

const voice: FeatureEntry = {
  id: "setting:voice",
  title: "Speech language",
  summary: "Language used for dictation.",
  where: "Settings, then Voice",
  kind: "setting",
  terms: ["microphone transcription"],
  sources: [
    {
      url: "https://github.com/pingdotgg/t3code/blob/main/docs/user/voice-input.md",
      label: "Docs",
    },
  ],
};

const fixture = [boring, projectGrouping, voice];

describe("searchFeatures", () => {
  it("maps sidebar project grouping to boring mode", () => {
    const result = searchFeatures("group projects in the sidebar", fixture);
    expect(result.best?.entry.id).toBe("setting:boring-sidebar");
    expect(result.best?.entry.where).toContain("Labs");
    expect(result.best ? matchPercent(result.best) : 0).toBeGreaterThan(80);
  });

  it("keeps a picked alternative when that id was a match", () => {
    const result = searchFeatures("group projects in the sidebar", fixture);
    expect(result.best).not.toBeNull();
    const withAlternative = {
      ...result,
      alternatives: [{ entry: projectGrouping, score: 12, coverage: 0.6 }],
    };
    expect(
      withPickedMatch(withAlternative, "setting:project-grouping").best?.entry
        .id,
    ).toBe("setting:project-grouping");
    expect(withPickedMatch(result, "missing").best?.entry.id).toBe(
      "setting:boring-sidebar",
    );
  });

  it("maps the name boring mode to the same setting", () => {
    const result = searchFeatures("boring mode", fixture);
    expect(result.best?.entry.id).toBe("setting:boring-sidebar");
  });

  it("returns no match when the words are not in the index", () => {
    const result = searchFeatures("underwater chess rankings", fixture);
    expect(result.best).toBeNull();
  });

  it("can rerank with embeddings and still falls back to lexical results", () => {
    const unrelated: FeatureEntry = {
      ...voice,
      id: "setting:unrelated",
      title: "Calendar mosaic",
      summary: "A made up row for the vector test.",
      terms: [],
    };
    const lexical = searchFeatures("group projects in the sidebar", [
      ...fixture,
      unrelated,
    ]);
    expect(lexical.best?.entry.id).toBe("setting:boring-sidebar");
    const vectors = {
      "setting:unrelated": [1, 0],
      "setting:boring-sidebar": [0, 1],
    };
    const semantic = searchWithVectors(
      "group projects in the sidebar",
      [...fixture, unrelated],
      vectors,
      [1, 0],
    );
    expect(semantic.matcher).toBe("embeddings");
    expect(semantic.best?.entry.id).toBe("setting:unrelated");
  });
});

describe("committed feature index", () => {
  const index = JSON.parse(
    readFileSync("data/feature-index.json", "utf8"),
  ) as FeatureIndex;

  it("cites a real T3 Code commit and includes boring mode", () => {
    expect(index.repository).toBe("https://github.com/pingdotgg/t3code");
    expect(index.commitSha).toMatch(/^[0-9a-f]{40}$/);
    const boringMode = index.entries.find(
      (entry) => entry.id === "setting:boring-sidebar",
    );
    expect(boringMode?.title).toBe("Boring sidebar (group by project)");
    expect(boringMode?.where).toBe("Settings, then Labs");
    expect(boringMode?.sources[0]?.url).toContain(
      "github.com/pingdotgg/t3code",
    );
  });

  it("answers the sidebar grouping question from the real index", () => {
    const result = searchFeatures(
      "group projects in the sidebar",
      index.entries,
    );
    expect(result.best?.entry.title.toLowerCase()).toContain("boring sidebar");
    expect(result.best?.entry.where.toLowerCase()).toContain("labs");
  });

  it("gives every entry a source url", () => {
    expect(index.entries.length).toBeGreaterThan(40);
    for (const entry of index.entries) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.sources.length).toBeGreaterThan(0);
      expect(entry.sources[0]?.url).toMatch(
        /^https:\/\/github\.com\/pingdotgg\/t3code/,
      );
    }
  });
});
