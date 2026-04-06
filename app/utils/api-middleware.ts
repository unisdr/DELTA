import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
type AnyArgs = LoaderFunctionArgs | ActionFunctionArgs;

export function withApiMiddleware<T extends (args: any) => any>(handler: T): T {
  return (async (args: AnyArgs) => {
    const { request } = args;
    // 1) auth
    const apiKey = request.headers.get("X-Auth");
    if (!apiKey) {
      throw new Response("Unauthorized", { status: 401 });
    }
    // 2) rate limit / validation / logging
    // if (!checkRateLimit(request)) throw new Response("Too Many Requests", { status: 429 });
    // 3) pass context to handler
    return handler({
      ...args,
      apiKey,
    });
  }) as T;
}