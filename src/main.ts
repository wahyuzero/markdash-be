// src/main.ts
import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { initKV } from "./utils/kv.ts";
import authRouter from "./routes/auth.ts";
import boardsRouter from "./routes/boards.ts";
import logsRouter from "./routes/logs.ts";
import notifyRouter from "./routes/notify.ts";
import exportRouter from "./routes/export.ts";

// Initialize Deno KV
await initKV();
console.log("✅ Deno KV initialized");

const app = new Application();
const PORT = parseInt(Deno.env.get("PORT") || "8000");

// CORS middleware
app.use(
  oakCors({
    origin: "*", // In production, specify your frontend domain
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Logger middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    `${ctx.request.method} ${ctx.request.url.pathname} - ${ctx.response.status} - ${ms}ms`,
  );
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Error:", err);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Internal server error",
      message: err.message,
    };
  }
});

// Routes
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

app.use(boardsRouter.routes());
app.use(boardsRouter.allowedMethods());

app.use(logsRouter.routes());
app.use(logsRouter.allowedMethods());

app.use(notifyRouter.routes());
app.use(notifyRouter.allowedMethods());

app.use(exportRouter.routes());
app.use(exportRouter.allowedMethods());

// Health check endpoint
app.use((ctx) => {
  if (ctx.request.url.pathname === "/") {
    ctx.response.body = {
      status: "ok",
      message: "MarkDash API is running",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  } else if (ctx.request.url.pathname === "/api") {
    ctx.response.body = {
      status: "ok",
      endpoints: {
        auth: {
          register: "POST /api/register",
          login: "POST /api/login",
          me: "GET /api/me",
          logout: "POST /api/logout",
        },
        boards: {
          list: "GET /api/boards",
          get: "GET /api/boards/:id",
          create: "POST /api/boards",
          update: "PUT /api/boards/:id",
          delete: "DELETE /api/boards/:id",
          public: "GET /api/public/:boardId",
        },
        logs: {
          list: "GET /api/logs/:boardId",
          getByDate: "GET /api/logs/:boardId/:date",
          create: "POST /api/logs",
          delete: "DELETE /api/logs/:id",
        },
        notifications: {
          list: "GET /api/notify/:boardId",
          create: "POST /api/notify",
          dismiss: "PATCH /api/notify/:id/dismiss",
          delete: "DELETE /api/notify/:id",
        },
        export: {
          markdown: "GET /api/export/:boardId/markdown",
          csv: "GET /api/export/:boardId/csv",
          json: "GET /api/export/all/json",
        },
      },
    };
  } else {
    ctx.response.status = 404;
    ctx.response.body = {
      success: false,
      error: "Not found",
    };
  }
});

console.log(`🚀 MarkDash API server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
