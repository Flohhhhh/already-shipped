import { describe, expect, it } from "vitest";

import { draftPost } from "../../../src/posts/draft";
import { rankPosts } from "../../../src/posts/rank";

describe("post drafts", () => {
  it("asks for a title and description", () => {
    expect(draftPost("short", "also short").ok).toBe(false);
    const draft = draftPost(
      "Group projects in the sidebar",
      "Cluster repositories together.",
    );
    expect(draft.ok).toBe(true);
  });
});

describe("post ranking", () => {
  it("ranks a close title above an unrelated post", () => {
    const ranked = rankPosts("group projects in the sidebar", [
      {
        id: "other",
        title: "Vim keybindings",
        description: "Modal editing in the terminal.",
      },
      {
        id: "sidebar",
        title: "Group projects in the sidebar",
        description: "Cluster repositories in the sidebar.",
      },
    ]);
    expect(ranked[0]?.id).toBe("sidebar");
    expect(ranked.some((post) => post.id === "other")).toBe(false);
  });
});
