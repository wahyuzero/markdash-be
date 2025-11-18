// src/middleware/performanceMiddleware.ts
import type { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// Simple in-memory cache for responses
interface CacheEntry {
  body: any;
  headers: Headers;
  timestamp: number;
  ttl: number;
}

const responseCache = new Map<string, CacheEntry>();

// Cleanup expired cache every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      responseCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Response Caching Middleware
 * Caches GET requests to improve response time
 */
export function cacheMiddleware(options?: {
  ttl?: number; // Time to live in milliseconds
  cacheable?: (ctx: Context) => boolean;
}) {
  const ttl = options?.ttl || 5 * 60 * 1000; // 5 minutes default
  const cacheable = options?.cacheable || ((ctx: Context) => {
    // Only cache GET requests
    return ctx.request.method === "GET";
  });

  return async (ctx: Context, next: Next) => {
    // Skip if not cacheable
    if (!cacheable(ctx)) {
      await next();
      return;
    }

    // Generate cache key
    const cacheKey = `${ctx.request.method}:${ctx.request.url.pathname}${ctx.request.url.search}`;

    // Check cache
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Return cached response
      ctx.response.status = 200;
      ctx.response.body = cached.body;
      for (const [key, value] of cached.headers.entries()) {
        ctx.response.headers.set(key, value);
      }
      ctx.response.headers.set("X-Cache", "HIT");
      return;
    }

    // Process request
    await next();

    // Cache successful responses
    if (ctx.response.status === 200) {
      responseCache.set(cacheKey, {
        body: ctx.response.body,
        headers: new Headers(ctx.response.headers),
        timestamp: Date.now(),
        ttl,
      });
      ctx.response.headers.set("X-Cache", "MISS");
    }
  };
}

/**
 * Response Compression Middleware
 * Adds Accept-Encoding hint for client
 */
export function compressionHint() {
  return async (ctx: Context, next: Next) => {
    await next();

    // Add Vary header for cache considerations
    ctx.response.headers.set("Vary", "Accept-Encoding");
  };
}

/**
 * Request Timeout Middleware
 * Prevents long-running requests from hanging
 */
export function timeoutMiddleware(timeoutMs = 30000) { // 30 seconds default
  return async (ctx: Context, next: Next) => {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error("Request timeout"));
      }, timeoutMs);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === "Request timeout") {
        ctx.response.status = 504;
        ctx.response.body = {
          success: false,
          error: "Request timeout",
          message: "The request took too long to process",
        };
      } else {
        throw error;
      }
    }
  };
}

/**
 * Performance Monitoring Middleware
 * Tracks request performance metrics
 */
export function performanceMonitor() {
  return async (ctx: Context, next: Next) => {
    const start = performance.now();

    await next();

    const duration = performance.now() - start;

    // Add performance header
    ctx.response.headers.set("X-Response-Time", `${duration.toFixed(2)}ms`);

    // Log slow requests (over 1 second)
    if (duration > 1000) {
      console.warn(
        `⚠️ Slow request: ${ctx.request.method} ${ctx.request.url.pathname} took ${duration.toFixed(2)}ms`
      );
    }
  };
}

/**
 * ETag Middleware
 * Implements conditional requests for better caching
 */
export function etagMiddleware() {
  return async (ctx: Context, next: Next) => {
    await next();

    // Only add ETag for successful GET requests
    if (ctx.request.method === "GET" && ctx.response.status === 200) {
      const body = JSON.stringify(ctx.response.body);
      
      // Simple hash function for ETag
      const hash = await crypto.subtle.digest(
        "SHA-1",
        new TextEncoder().encode(body)
      );
      const etag = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16);

      ctx.response.headers.set("ETag", `"${etag}"`);

      // Check If-None-Match header
      const ifNoneMatch = ctx.request.headers.get("If-None-Match");
      if (ifNoneMatch === `"${etag}"`) {
        ctx.response.status = 304; // Not Modified
        ctx.response.body = null;
      }
    }
  };
}

/**
 * Keep-Alive Header Middleware
 * Improves connection reuse
 */
export function keepAliveMiddleware() {
  return async (ctx: Context, next: Next) => {
    await next();
    
    ctx.response.headers.set("Connection", "keep-alive");
    ctx.response.headers.set("Keep-Alive", "timeout=5, max=1000");
  };
}

/**
 * Clear Cache Utility
 * For manual cache invalidation
 */
export function clearCache(pattern?: string) {
  if (!pattern) {
    responseCache.clear();
    console.log("✅ All cache cleared");
    return;
  }

  let count = 0;
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key);
      count++;
    }
  }
  console.log(`✅ Cleared ${count} cache entries matching: ${pattern}`);
}

/**
 * Cache Statistics
 */
export function getCacheStats() {
  return {
    size: responseCache.size,
    entries: Array.from(responseCache.keys()),
  };
}