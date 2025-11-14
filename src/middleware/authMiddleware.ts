// src/middleware/authMiddleware.ts
import type { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { verifyToken } from "../utils/crypto.ts";
import { unauthorized } from "../utils/response.ts";

export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(ctx, "Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload) {
    return unauthorized(ctx, "Invalid or expired token");
  }

  // Add user info to context state
  ctx.state.userId = payload.userId;
  ctx.state.username = payload.username;

  await next();
}
