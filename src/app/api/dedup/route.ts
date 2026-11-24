import { dedupDraft } from "@/server/dedup/service";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = typeof record.title === "string" ? record.title : "";
  const description =
    typeof record.description === "string" ? record.description : "";
  const result = await dedupDraft(title, description);
  return Response.json(result);
}
