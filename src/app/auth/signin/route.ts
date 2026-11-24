import { authHandlers } from "@/lib/serverAuth";

export const POST = (request: Request) => {
  if (!authHandlers)
    return new Response("Convex is not configured.", { status: 503 });
  return authHandlers.convexProxyHandler(request);
};
