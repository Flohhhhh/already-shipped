import { suggestCatalog } from "@/server/search/service";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ suggestions: suggestCatalog(query) });
}
