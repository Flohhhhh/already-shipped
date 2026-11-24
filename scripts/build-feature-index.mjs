import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY = "pingdotgg/t3code";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SETTINGS_PATH = "apps/web/src/components/settings/settingsSearch.ts";
const DOCS_PATH = "docs/user";
const BULLETS_PER_RELEASE = 8;

function ghApi(args) {
  return execFileSync("gh", ["api", ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

function rawFile(filePath) {
  return ghApi([
    "-H",
    "Accept: application/vnd.github.raw",
    `repos/${REPOSITORY}/contents/${filePath}`,
  ]);
}

const PAIRS = { "{": "}", "[": "]", "(": ")" };

function sliceBracket(source, openIndex) {
  const stack = [];
  let quote = null;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      const newline = source.indexOf("\n", index);
      index = newline < 0 ? source.length : newline;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (PAIRS[char]) stack.push(PAIRS[char]);
    else if (stack.length > 0 && char === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return source.slice(openIndex, index + 1);
    }
  }
  throw new Error("Unbalanced brackets while parsing T3 Code source");
}

function splitTopLevelObjects(arrayText) {
  const objects = [];
  const stack = [];
  let quote = null;
  let objectStart = -1;
  for (let index = 0; index < arrayText.length; index += 1) {
    const char = arrayText[index];
    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "/" && arrayText[index + 1] === "/") {
      const newline = arrayText.indexOf("\n", index);
      index = newline < 0 ? arrayText.length : newline;
      continue;
    }
    if (char === "/" && arrayText[index + 1] === "*") {
      const end = arrayText.indexOf("*/", index + 2);
      index = end < 0 ? arrayText.length : end + 1;
      continue;
    }
    if (PAIRS[char]) {
      if (char === "{" && stack.length === 1) objectStart = index;
      stack.push(PAIRS[char]);
    } else if (stack.length > 0 && char === stack[stack.length - 1]) {
      stack.pop();
      if (char === "}" && stack.length === 1 && objectStart >= 0) {
        objects.push(arrayText.slice(objectStart, index + 1));
        objectStart = -1;
      }
    }
  }
  return objects;
}

function unescapeString(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function firstStringLiteral(text) {
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "/" && text[index + 1] === "/") {
      const newline = text.indexOf("\n", index);
      index = newline < 0 ? text.length : newline;
      continue;
    }
    if (/\s/.test(char)) continue;
    if (char !== '"' && char !== "'" && char !== "`") return null;
    let end = index + 1;
    while (end < text.length) {
      if (text[end] === "\\") {
        end += 2;
        continue;
      }
      if (text[end] === char) break;
      end += 1;
    }
    return unescapeString(text.slice(index + 1, end));
  }
  return null;
}

function extractMsgStrings(text) {
  const messages = [];
  for (let index = 0; index < text.length; index += 1) {
    const boundary = index === 0 || !/[\w$]/.test(text[index - 1]);
    if (!boundary || !text.startsWith("msg(", index)) continue;
    const call = sliceBracket(text, index + 3);
    const message = firstStringLiteral(call.slice(1, -1));
    if (message) messages.push(message);
    index = index + 3 + call.length - 1;
  }
  return messages;
}

function matchStringField(text, field) {
  const match = text.match(new RegExp(`\\b${field}\\s*:\\s*"([^"]+)"`));
  return match?.[1] ?? null;
}

export function parseSectionLabels(source) {
  const start = source.indexOf("export const SETTINGS_SECTION_LABELS");
  if (start < 0) throw new Error("SETTINGS_SECTION_LABELS not found");
  const block = sliceBracket(source, source.indexOf("{", start));
  const labels = new Map();
  for (const match of block.matchAll(
    /"(\/settings\/[^"]+)"\s*:\s*msg\(\s*"([^"]+)"/g,
  )) {
    labels.set(match[1], match[2]);
  }
  return labels;
}

export function parseSettingsSearch(source) {
  const labels = parseSectionLabels(source);
  const marker = "export const SETTINGS_SEARCH_ITEMS = [";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("SETTINGS_SEARCH_ITEMS not found");
  const arrayText = sliceBracket(source, source.indexOf("[", start));
  const entries = [];
  for (const objectText of splitTopLevelObjects(arrayText)) {
    const id = matchStringField(objectText, "id");
    const to = matchStringField(objectText, "to");
    const messages = extractMsgStrings(objectText);
    const title = messages[0];
    const label = to ? labels.get(to) : undefined;
    if (!id || !to || !title || !label) continue;
    entries.push({
      id: `setting:${id}`,
      settingId: id,
      title,
      terms: messages.slice(1),
      where: `Settings, then ${label}`,
      path: to,
    });
  }
  return entries;
}

export function githubSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function whereFromDoc(text) {
  const match = text.match(/Settings\s*(?:→|->|>)\s*([^\n]+)/);
  if (!match) return null;
  let rest = match[1] ?? "";
  rest = rest.split("**")[0] ?? rest;
  rest =
    rest.split(/\.(?:\s|$)|\bon web\b|\bon desktop\b|\bon mobile\b/i)[0] ??
    rest;
  const parts = rest
    .split(/\s*(?:→|->|>)\s*/)
    .map((part) => part.replace(/[*_`]/g, "").trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return ["Settings", ...parts].join(", then ");
}

export function parseDocSections(filename, markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = null;
  const flush = () => {
    if (current && current.title.length > 2) sections.push(current);
  };
  for (const line of lines) {
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      current = { title: heading[2].trim(), body: [] };
    } else if (current) current.body.push(line);
  }
  flush();
  return sections
    .map((section) => {
      const body = section.body.join("\n");
      const summary = plainText(body).slice(0, 360);
      if (summary.length < 40) return null;
      return {
        filename,
        title: section.title.replace(/[`*]/g, ""),
        summary,
        body,
      };
    })
    .filter(Boolean);
}

export function parseReleaseBullets(body) {
  if (!body) return [];
  const bullets = [];
  for (const line of body.split("\n")) {
    const match = /^\s*[-*]\s+(.+)$/.exec(line);
    if (!match) continue;
    const text = plainText(match[1] ?? "");
    if (text.length < 40 || text.length > 280) continue;
    if (/^https?:/i.test(text) || /full changelog/i.test(text)) continue;
    bullets.push(text);
  }
  return bullets.slice(0, BULLETS_PER_RELEASE);
}

function parseJsonLines(text) {
  const objects = [];
  let buffer = "";
  for (const line of text.split("\n")) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    const trimmed = buffer.trim();
    if (!trimmed) {
      buffer = "";
      continue;
    }
    try {
      objects.push(JSON.parse(trimmed));
      buffer = "";
    } catch {
      // Keep reading until a full JSON value is buffered.
    }
  }
  return objects;
}

function fetchReleases() {
  const releases = [];
  let stables = 0;
  let nightlies = 0;
  for (let page = 1; page <= 8 && (stables < 20 || nightlies < 15); page += 1) {
    const raw = ghApi([
      `repos/${REPOSITORY}/releases?per_page=20&page=${page}`,
      "--jq",
      ".[] | {tag_name,html_url,prerelease,body}",
    ]);
    const batch = parseJsonLines(raw);
    if (batch.length === 0) break;
    for (const release of batch) {
      if (release.prerelease) {
        if (nightlies >= 15) continue;
        nightlies += 1;
      } else if (stables >= 20) continue;
      else stables += 1;
      releases.push(release);
    }
  }
  return releases;
}

function lineOf(source, needle) {
  const index = source.indexOf(needle);
  if (index < 0) return null;
  return source.slice(0, index).split("\n").length;
}

function sentenceWith(text, needle) {
  const plain = plainText(text);
  const index = plain.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return null;
  const start = Math.max(0, plain.lastIndexOf(".", index) + 1);
  let end = plain.indexOf(".", index + needle.length);
  if (end < 0) end = Math.min(plain.length, index + 280);
  else end += 1;
  const sentence = plain.slice(start, end).trim();
  if (sentence.length < needle.length) return null;
  return sentence.length > 320 ? `${sentence.slice(0, 317)}...` : sentence;
}

function buildIndex() {
  const commitSha = ghApi([
    `repos/${REPOSITORY}/commits/main`,
    "--jq",
    ".sha",
  ]).trim();
  const settingsSource = rawFile(SETTINGS_PATH);
  const settings = parseSettingsSearch(settingsSource);
  if (!settings.some((entry) => entry.id === "setting:boring-sidebar")) {
    throw new Error("Refusing to write an index that missed Boring sidebar");
  }

  const docNames = JSON.parse(
    ghApi([
      `repos/${REPOSITORY}/contents/${DOCS_PATH}`,
      "--jq",
      '[.[] | select(.type=="file") | .name]',
    ]),
  );
  const docs = [];
  for (const name of docNames) {
    if (!name.endsWith(".md") || name === "open-source-licenses.md") continue;
    const markdown = rawFile(`${DOCS_PATH}/${name}`);
    for (const section of parseDocSections(name, markdown)) docs.push(section);
  }
  if (!docs.some((section) => section.body.includes("Boring sidebar"))) {
    throw new Error(
      "Refusing to write an index that missed the Boring sidebar doc",
    );
  }

  const releases = fetchReleases();

  const entries = [];
  for (const setting of settings) {
    const line = lineOf(settingsSource, `id: "${setting.settingId}"`);
    const definitionUrl = `https://github.com/${REPOSITORY}/blob/${commitSha}/${SETTINGS_PATH}${line ? `#L${line}` : ""}`;
    let summary = "";
    let docSource = null;
    for (const section of docs) {
      const sentence = sentenceWith(section.body, setting.title);
      if (!sentence) continue;
      summary = sentence;
      docSource = {
        url: `https://github.com/${REPOSITORY}/blob/${commitSha}/${DOCS_PATH}/${section.filename}#${githubSlug(section.title)}`,
        label: `Docs · ${section.title}`,
      };
      break;
    }
    entries.push({
      id: setting.id,
      title: setting.title,
      summary,
      where: setting.where,
      kind: "setting",
      terms: setting.terms,
      sources: [
        { url: definitionUrl, label: "Setting definition" },
        ...(docSource ? [docSource] : []),
      ],
    });
  }

  for (const section of docs) {
    const where =
      whereFromDoc(section.body) ??
      `Docs · ${section.filename.replace(/\.md$/, "")}`;
    entries.push({
      id: `doc:${section.filename}#${githubSlug(section.title)}`,
      title: section.title,
      summary: section.summary,
      where,
      kind: "doc",
      terms: [],
      sources: [
        {
          url: `https://github.com/${REPOSITORY}/blob/${commitSha}/${DOCS_PATH}/${section.filename}#${githubSlug(section.title)}`,
          label: `Docs · ${section.filename}`,
        },
      ],
    });
  }

  const seenBullets = new Set();
  for (const release of releases) {
    for (const bullet of parseReleaseBullets(release.body)) {
      const key = bullet.toLowerCase();
      if (seenBullets.has(key)) continue;
      seenBullets.add(key);
      const title = bullet.length > 110 ? `${bullet.slice(0, 107)}...` : bullet;
      entries.push({
        id: `release:${release.tag_name}:${seenBullets.size}`,
        title,
        summary: bullet,
        where: `Release ${release.tag_name}`,
        kind: "release",
        terms: [],
        sources: [
          {
            url: release.html_url,
            label: `Release ${release.tag_name}`,
          },
        ],
      });
    }
  }

  const index = {
    generatedAt: new Date().toISOString(),
    commitSha,
    repository: `https://github.com/${REPOSITORY}`,
    entries,
  };
  mkdirSync(path.join(ROOT, "data"), { recursive: true });
  writeFileSync(
    path.join(ROOT, "data", "feature-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  console.log(`Wrote ${entries.length} entries at ${commitSha.slice(0, 12)}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) buildIndex();
