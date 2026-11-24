import { tokenize } from "../text/tokens";

const TITLE_MIN = 8;
const TITLE_MAX = 120;
const DESCRIPTION_MIN = 8;
const DESCRIPTION_MAX = 2000;

export type PostDraft =
  | {
      ok: true;
      title: string;
      description: string;
      normalizedKey: string;
      tokens: string[];
    }
  | { ok: false; error: string };

export function cleanPostText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function draftPost(
  titleInput: string,
  descriptionInput: string,
): PostDraft {
  const title = cleanPostText(titleInput);
  const description = cleanPostText(descriptionInput);
  if (title.length < TITLE_MIN || description.length < DESCRIPTION_MIN) {
    return { ok: false, error: "Add a title and a short description." };
  }
  if (title.length > TITLE_MAX) {
    return { ok: false, error: "Keep the title under 120 characters." };
  }
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, error: "Keep the description under 2000 characters." };
  }
  const tokens = tokenize(`${title} ${description}`).sort();
  if (tokenize(title).length < 2) {
    return { ok: false, error: "Say a little more in the title." };
  }
  return {
    ok: true,
    title,
    description,
    normalizedKey: tokens.join(" "),
    tokens,
  };
}
