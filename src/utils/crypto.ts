// src/utils/crypto.ts
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import type { JWTPayload } from "../types.ts";

const JWT_SECRET =
  Deno.env.get("JWT_SECRET") || "your-secret-key-change-in-production";
const encoder = new TextEncoder();
const keyData = encoder.encode(JWT_SECRET);

// Generate crypto key for JWT
async function getKey() {
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// Hash password with bcrypt (SYNC version for Deno Deploy compatibility)
// Deno Deploy doesn't support Web Workers, so we use sync methods
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password);
}

// Verify password (SYNC version for Deno Deploy compatibility)
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Generate JWT token
export async function generateToken(
  userId: string,
  username: string,
): Promise<string> {
  const key = await getKey();

  const payload: JWTPayload = {
    userId,
    username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 day
  };

  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const key = await getKey();
    const payload = await verify(token, key);
    return payload as JWTPayload;
  } catch (_error) {
    return null;
  }
}

// Generate random ID
export function generateId(): string {
  return crypto.randomUUID();
}
