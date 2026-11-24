import { describe, expect, it } from "vitest";

import {
  DEFAULT_ADMIN_GITHUB_IDS,
  isAdminAccount,
  reopenAutoClose,
  resolveAutoCloseThreshold,
  shipmentOutcome,
  suggestPair,
} from "../../../src/jobs/review";
import { topCandidates } from "../../../src/jobs/similarity";
import {
  cursorAfter,
  selectNewReleases,
  sourceIdFor,
} from "../../../src/jobs/changelog";

const releases = [
  { id: "30", tag: "v3", url: "https://example.com/3", body: "" },
  { id: "20", tag: "v2", url: "https://example.com/2", body: "" },
  { id: "10", tag: "v1", url: "https://example.com/1", body: "" },
];

describe("changelog cursor", () => {
  it("starts at the newest releases and then stops at the cursor", () => {
    expect(
      selectNewReleases(releases, null).map((release) => release.id),
    ).toEqual(["10", "20", "30"]);
    expect(
      selectNewReleases(releases, "20").map((release) => release.id),
    ).toEqual(["30"]);
    expect(selectNewReleases(releases, "30")).toEqual([]);
  });

  it("advances the cursor only after every selected release is stored", () => {
    const selected = selectNewReleases(releases, "10");
    expect(cursorAfter(releases, selected, new Set(["20"]))).toBeNull();
    expect(cursorAfter(releases, selected, new Set(["20", "30"]))).toBe("30");
  });

  it("keeps the same source id for the same line", () => {
    const text = "Pending review comments now survive a reload of the window.";
    expect(sourceIdFor("20", text)).toBe(sourceIdFor("20", text));
  });
});

describe("shipment outcomes", () => {
  it("auto-closes only when embedding similarity and confidence both clear", () => {
    expect(shipmentOutcome(0.95, true, 0.9)).toBe("auto");
    expect(shipmentOutcome(0.95, false, 0.9)).toBe("review");
    expect(shipmentOutcome(0.72, true, 0.9)).toBe("review");
    expect(shipmentOutcome(0.4, true, 0.9)).toBe("ignore");
    expect(resolveAutoCloseThreshold(undefined)).toBe(0.9);
    expect(resolveAutoCloseThreshold("0.8")).toBe(0.8);
    expect(resolveAutoCloseThreshold("nope")).toBe(0.9);
  });

  it("ranks by embedding before falling back to words", () => {
    const entries = [
      {
        sourceId: "far",
        summary: "unrelated sidebar grouping",
        version: "v1",
        url: "",
        embedding: [0, 1],
      },
      {
        sourceId: "near",
        summary: "review comments survive reload",
        version: "v1",
        url: "",
        embedding: [1, 0],
      },
    ];
    expect(
      topCandidates(
        { title: "comments", description: "reload" },
        entries,
        [1, 0],
        1,
      )[0]?.sourceId,
    ).toBe("near");
    expect(
      topCandidates(
        {
          title: "review comments survive reload",
          description: "Keep the draft after refresh.",
        },
        entries.map((entry) => ({ ...entry, embedding: null })),
        null,
        1,
      )[0]?.matchedBy,
    ).toBe("lexical");
  });
});

describe("review transitions", () => {
  it("skips a pair that was dismissed, auto-closed, or reopened", () => {
    expect(suggestPair(null)).toBe("create");
    expect(suggestPair("dismissed")).toBe("skip");
    expect(suggestPair("auto")).toBe("skip");
    expect(suggestPair("reopened")).toBe("skip");
  });

  it("reopens only an auto-closed suggestion", () => {
    expect(reopenAutoClose("auto")).toEqual({ status: "reopened" });
    expect(reopenAutoClose("pending")).toEqual({
      error: "Only an auto-closed suggestion can be reopened.",
    });
    expect(reopenAutoClose("reopened")).toEqual({
      error: "Only an auto-closed suggestion can be reopened.",
    });
  });
});

describe("admin accounts", () => {
  it("defaults to the GitHub account id and ignores unverified email", () => {
    expect(DEFAULT_ADMIN_GITHUB_IDS).toBe("48927090");
    expect(
      isAdminAccount(
        { provider: "github", providerAccountId: "48927090" },
        { emails: "" },
      ),
    ).toBe(true);
    expect(
      isAdminAccount(
        {
          provider: "github",
          providerAccountId: "1",
          email: "person@example.com",
          emailVerified: false,
        },
        { githubIds: "2", emails: "person@example.com" },
      ),
    ).toBe(false);
    expect(
      isAdminAccount(
        {
          provider: "github",
          providerAccountId: "1",
          email: "Person@example.com",
          emailVerified: true,
        },
        { githubIds: "2", emails: "person@example.com" },
      ),
    ).toBe(true);
    expect(
      isAdminAccount(
        { provider: "discord", providerAccountId: "48927090" },
        {},
      ),
    ).toBe(false);
  });
});
