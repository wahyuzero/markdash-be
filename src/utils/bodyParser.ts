// src/utils/bodyParser.ts
// Helper untuk parsing request body di Oak

import type { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";

/**
 * Parse JSON body dari request Oak
 * @param ctx - Oak context
 * @returns Parsed JSON object
 */
export async function parseBody<T = any>(ctx: Context): Promise<T> {
  try {
    const body = ctx.request.body();
    const bodyType = body.type;

    if (bodyType === "json") {
      return (await body.value) as T;
    } else if (bodyType === "form" || bodyType === "form-data") {
      const formData = await body.value;
      const obj: any = {};
      for (const [key, value] of formData.entries()) {
        obj[key] = value;
      }
      return obj as T;
    } else {
      throw new Error(`Unsupported content type: ${bodyType}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse body: ${error.message}`);
  }
}

/**
 * Check if request has body
 */
export function hasBody(ctx: Context): boolean {
  return ctx.request.hasBody;
}
