// src/utils/response.ts
import type { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import type { ApiResponse } from "../types.ts";

export function success<T>(ctx: Context, data: T, status = 200) {
  ctx.response.status = status;
  ctx.response.body = {
    success: true,
    data,
  } as ApiResponse<T>;
}

export function error(ctx: Context, message: string, status = 400) {
  ctx.response.status = status;
  ctx.response.body = {
    success: false,
    error: message,
  } as ApiResponse;
}

export function created<T>(ctx: Context, data: T) {
  success(ctx, data, 201);
}

export function noContent(ctx: Context) {
  ctx.response.status = 204;
}

export function unauthorized(ctx: Context, message = "Unauthorized") {
  error(ctx, message, 401);
}

export function forbidden(ctx: Context, message = "Forbidden") {
  error(ctx, message, 403);
}

export function notFound(ctx: Context, message = "Not found") {
  error(ctx, message, 404);
}
