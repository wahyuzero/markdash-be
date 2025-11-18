// src/middleware/securityMiddleware.ts
import type { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// Simple in-memory rate limiter (works in Deno Deploy)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate Limiting Middleware
 * Protects against brute force and DDoS attacks
 */
export function rateLimitMiddleware(options?: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
}) {
  const windowMs = options?.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxRequests = options?.maxRequests || 100; // 100 requests per window
  const message = options?.message || "Too many requests, please try again later";

  return async (ctx: Context, next: Next) => {
    // Get client identifier (IP address)
    const clientId = ctx.request.ip || 
                     ctx.request.headers.get("x-forwarded-for") || 
                     ctx.request.headers.get("x-real-ip") || 
                     "unknown";

    const now = Date.now();
    const key = `ratelimit:${clientId}`;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Set rate limit headers
    ctx.response.headers.set("X-RateLimit-Limit", maxRequests.toString());
    ctx.response.headers.set("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count).toString());
    ctx.response.headers.set("X-RateLimit-Reset", new Date(entry.resetTime).toISOString());

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      ctx.response.status = 429;
      ctx.response.body = {
        success: false,
        error: message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
      return;
    }

    await next();
  };
}

/**
 * Strict Rate Limiting for Auth Endpoints
 * Prevents brute force attacks on login/register
 */
export function authRateLimitMiddleware() {
  return rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Only 5 attempts per 15 minutes
    message: "Too many authentication attempts, please try again later",
  });
}

/**
 * Request Size Limiter
 * Prevents large payload attacks
 */
export function requestSizeLimiter(maxSizeBytes = 10 * 1024 * 1024) { // 10MB default
  return async (ctx: Context, next: Next) => {
    const contentLength = ctx.request.headers.get("content-length");
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      ctx.response.status = 413;
      ctx.response.body = {
        success: false,
        error: "Request body too large",
        maxSize: `${maxSizeBytes / 1024 / 1024}MB`,
      };
      return;
    }

    await next();
  };
}

/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */
export function securityHeaders() {
  return async (ctx: Context, next: Next) => {
    await next();

    // Set security headers
    ctx.response.headers.set("X-Content-Type-Options", "nosniff");
    ctx.response.headers.set("X-Frame-Options", "DENY");
    ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
    ctx.response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    ctx.response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );
    
    // Only add HSTS in production (HTTPS)
    if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
      ctx.response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
  };
}

/**
 * Request Validation Middleware
 * Validates common attack patterns
 */
export function requestValidator() {
  return async (ctx: Context, next: Next) => {
    const path = ctx.request.url.pathname;
    
    // Check for path traversal attempts
    if (path.includes("..") || path.includes("~")) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Invalid request path",
      };
      return;
    }

    // Check for SQL injection patterns in query params
    const url = new URL(ctx.request.url);
    for (const [_key, value] of url.searchParams.entries()) {
      const lowercaseValue = value.toLowerCase();
      if (
        lowercaseValue.includes("select ") ||
        lowercaseValue.includes("drop ") ||
        lowercaseValue.includes("insert ") ||
        lowercaseValue.includes("delete ") ||
        lowercaseValue.includes("update ") ||
        lowercaseValue.includes("union ")
      ) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Invalid request parameters",
        };
        return;
      }
    }

    await next();
  };
}

/**
 * IP Whitelist/Blacklist Middleware (Optional)
 */
export function ipFilter(options: {
  whitelist?: string[];
  blacklist?: string[];
}) {
  return async (ctx: Context, next: Next) => {
    const clientIp = ctx.request.ip || 
                     ctx.request.headers.get("x-forwarded-for") || 
                     ctx.request.headers.get("x-real-ip");

    if (!clientIp) {
      await next();
      return;
    }

    // Check blacklist
    if (options.blacklist && options.blacklist.includes(clientIp)) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied",
      };
      return;
    }

    // Check whitelist (if specified, only allow whitelisted IPs)
    if (options.whitelist && options.whitelist.length > 0) {
      if (!options.whitelist.includes(clientIp)) {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          error: "Access denied",
        };
        return;
      }
    }

    await next();
  };
}