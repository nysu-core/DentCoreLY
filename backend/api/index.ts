import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/app";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const forwardedPath = requestUrl.searchParams.get("__vercel_path");

  if (forwardedPath !== null) {
    requestUrl.searchParams.delete("__vercel_path");
    const query = requestUrl.searchParams.toString();
    req.url = `/api/${forwardedPath}${query ? `?${query}` : ""}`;
  }

  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}