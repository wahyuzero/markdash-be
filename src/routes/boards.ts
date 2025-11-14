// src/routes/boards.ts
import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import type { Board } from "../types.ts";
import { generateId } from "../utils/crypto.ts";
import {
  getBoard,
  getBoardsByUserId,
  setBoard,
  deleteBoard as kvDeleteBoard,
  getPublicBoard,
} from "../utils/kv.ts";
import {
  success,
  error,
  created,
  noContent,
  notFound,
  forbidden,
} from "../utils/response.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";

const router = new Router();

// Get all boards for current user
router.get("/api/boards", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.userId!;
    const boards = await getBoardsByUserId(userId);
    success(ctx, boards);
  } catch (err) {
    error(ctx, "Failed to fetch boards: " + err.message, 500);
  }
});

// Get specific board by ID
router.get("/api/boards/:id", authMiddleware, async (ctx) => {
  try {
    const boardId = ctx.params.id;
    const userId = ctx.state.userId!;

    const board = (await getBoard(userId, boardId)) as Board | null;

    if (!board) {
      return notFound(ctx, "Board not found");
    }

    success(ctx, board);
  } catch (err) {
    error(ctx, "Failed to fetch board: " + err.message, 500);
  }
});

// Create new board
router.post("/api/boards", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.userId!;
    const body = await ctx.request.body();
    const { title, markdown, visibility, schedule, resetTime } =
      await body.value;

    if (!title || !markdown) {
      return error(ctx, "Title and markdown are required");
    }

    const boardId = generateId();
    const now = new Date().toISOString();

    const newBoard: Board = {
      id: boardId,
      userId,
      title,
      markdown,
      visibility: visibility || "private",
      schedule: schedule || "daily",
      resetTime: resetTime || "00:00",
      createdAt: now,
      updatedAt: now,
    };

    await setBoard(userId, boardId, newBoard);
    created(ctx, newBoard);
  } catch (err) {
    error(ctx, "Failed to create board: " + err.message, 500);
  }
});

// Update board
router.put("/api/boards/:id", authMiddleware, async (ctx) => {
  try {
    const boardId = ctx.params.id;
    const userId = ctx.state.userId!;

    const board = (await getBoard(userId, boardId)) as Board | null;

    if (!board) {
      return notFound(ctx, "Board not found");
    }

    const body = await ctx.request.body();
    const { title, markdown, visibility, schedule, resetTime } =
      await body.value;

    const updatedBoard: Board = {
      ...board,
      ...(title && { title }),
      ...(markdown && { markdown }),
      ...(visibility && { visibility }),
      ...(schedule && { schedule }),
      ...(resetTime && { resetTime }),
      updatedAt: new Date().toISOString(),
    };

    await setBoard(userId, boardId, updatedBoard);
    success(ctx, updatedBoard);
  } catch (err) {
    error(ctx, "Failed to update board: " + err.message, 500);
  }
});

// Delete board
router.delete("/api/boards/:id", authMiddleware, async (ctx) => {
  try {
    const boardId = ctx.params.id;
    const userId = ctx.state.userId!;

    const board = await getBoard(userId, boardId);

    if (!board) {
      return notFound(ctx, "Board not found");
    }

    await kvDeleteBoard(userId, boardId);
    noContent(ctx);
  } catch (err) {
    error(ctx, "Failed to delete board: " + err.message, 500);
  }
});

// BONUS: Get public board (no auth required)
router.get("/api/public/:boardId", async (ctx) => {
  try {
    const boardId = ctx.params.boardId;
    const board = await getPublicBoard(boardId);

    if (!board) {
      return notFound(ctx, "Public board not found");
    }

    success(ctx, board);
  } catch (err) {
    error(ctx, "Failed to fetch public board: " + err.message, 500);
  }
});

export default router;
