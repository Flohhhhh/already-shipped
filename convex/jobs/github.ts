import type { RemoteRelease } from "../../src/jobs/changelog";

const REPO = "pingdotgg/t3code";

function githubHeaders(token: string | undefined) {
  return {
    accept: "application/vnd.github+json",
    "user-agent": "already-shipped",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

const RELEASES_URL =
  "https://api.github.com/repos/pingdotgg/t3code/releases?per_page=20";

export async function fetchRecentReleases(): Promise<RemoteRelease[]> {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "already-shipped",
      },
    });
    if (!response.ok) return [];
    const json = (await response.json()) as {
      id?: number;
      tag_name?: string;
      html_url?: string;
      body?: string | null;
    }[];
    if (!Array.isArray(json)) return [];
    const releases: RemoteRelease[] = [];
    for (const release of json) {
      if (
        typeof release.id !== "number" ||
        typeof release.tag_name !== "string"
      )
        continue;
      if (typeof release.html_url !== "string") continue;
      releases.push({
        id: String(release.id),
        tag: release.tag_name,
        url: release.html_url,
        body: release.body ?? "",
      });
    }
    return releases;
  } catch {
    return [];
  }
}

export type RemoteRequest = {
  sourceId: string;
  url: string;
  cursor: string;
  text: string;
};

export async function fetchGithubIssues(
  token: string | undefined,
): Promise<RemoteRequest[] | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/issues?state=open&sort=updated&direction=desc&per_page=20`,
      { headers: githubHeaders(token) },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as {
      pull_request?: unknown;
      number?: number;
      title?: string;
      body?: string | null;
      html_url?: string;
      updated_at?: string;
    }[];
    if (!Array.isArray(json)) return null;
    const issues: RemoteRequest[] = [];
    for (const issue of json) {
      if (issue.pull_request) continue;
      if (typeof issue.number !== "number" || typeof issue.title !== "string")
        continue;
      if (
        typeof issue.html_url !== "string" ||
        typeof issue.updated_at !== "string"
      )
        continue;
      issues.push({
        sourceId: `github:issue:${issue.number}`,
        url: issue.html_url,
        cursor: issue.updated_at,
        text: `${issue.title}\n${issue.body ?? ""}`.slice(0, 700),
      });
    }
    return issues;
  } catch {
    return null;
  }
}

export async function fetchGithubDiscussions(
  token: string | undefined,
): Promise<RemoteRequest[] | null> {
  if (!token) return null;
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: githubHeaders(token),
      body: JSON.stringify({
        query: `query { repository(owner: "pingdotgg", name: "t3code") { discussions(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { id number title url updatedAt body } } } }`,
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      data?: {
        repository?: {
          discussions?: {
            nodes?: {
              id?: string;
              number?: number;
              title?: string;
              url?: string;
              updatedAt?: string;
              body?: string | null;
            }[];
          };
        };
      };
    };
    const nodes = json.data?.repository?.discussions?.nodes;
    if (!nodes) return null;
    const discussions: RemoteRequest[] = [];
    for (const node of nodes) {
      if (
        !node?.id ||
        typeof node.title !== "string" ||
        typeof node.url !== "string"
      )
        continue;
      if (typeof node.updatedAt !== "string") continue;
      discussions.push({
        sourceId: `github:discussion:${node.number ?? node.id}`,
        url: node.url,
        cursor: node.updatedAt,
        text: `${node.title}\n${node.body ?? ""}`.slice(0, 700),
      });
    }
    return discussions;
  } catch {
    return null;
  }
}
