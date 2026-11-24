import { describe, expect, it } from "vitest";

import {
  parseSettingsSearch,
  whereFromDoc,
} from "../../../scripts/build-feature-index.mjs";

const SETTINGS_SNIPPET = `
export const SETTINGS_SECTION_LABELS: Readonly<Record<SettingsPath, string>> = {
  "/settings/general": msg("General"),
  "/settings/labs": msg("Labs"),
};

export const SETTINGS_SEARCH_ITEMS = [
  {
    id: "project-grouping",
    title: msg("Project grouping"),
    to: "/settings/general",
    searchTerms: [msg("combine matching repositories environments sidebar")],
  },
  {
    id: "boring-sidebar",
    title: msg("Boring sidebar (group by project)"),
    to: "/settings/labs",
    searchTerms: [msg("beta folders project tree classic sidebar")],
  },
  {
    id: keybindingSearchAnchorId(command),
    title: commandLabel(command),
    to: "/settings/keybindings",
  },
];
`;

describe("feature index parser", () => {
  it("reads setting titles and locations from the T3 Code search catalog", () => {
    const entries = parseSettingsSearch(SETTINGS_SNIPPET);
    const boring = entries.find(
      (entry) => entry.id === "setting:boring-sidebar",
    );
    expect(boring).toMatchObject({
      title: "Boring sidebar (group by project)",
      where: "Settings, then Labs",
      terms: ["beta folders project tree classic sidebar"],
    });
    expect(
      entries.some((entry) => entry.id.startsWith("setting:keybinding")),
    ).toBe(false);
  });

  it("turns a documented settings path into a place to look", () => {
    const where = whereFromDoc(
      "Turn on **Settings → Labs → Boring sidebar (group by project)** on web and desktop to put active threads in a folder for each project.",
    );
    expect(where).toBe(
      "Settings, then Labs, then Boring sidebar (group by project)",
    );
  });
});
