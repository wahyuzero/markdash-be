// src/routes/logs.ts
import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import type { Log } from "../types.ts";
import { generateId } from "../utils/crypto.ts";
import {
  getLog,
  getLogsByBoardId,
  setLog,
  deleteLog as kvDeleteLog,
  getBoard,
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

// Get all logs for a board
router.get("/api/logs/:boardId", authMiddleware, async (ctx) => {
  try {
    const boardId = ctx.params.boardId;
    const userId = ctx.state.userId!;

    // Verify board belongs to user
    const board = await getBoard(userId, boardId);
    if (!board) {
      return forbidden(ctx, "Access denied");
    }

    const logs = await getLogsByBoardId(boardId);
    success(ctx, logs);
  } catch (err) {
    error(ctx, "Failed to fetch logs: " + err.message, 500);
  }
});

// Get log for specific date
router.get("/api/logs/:boardId/:date", authMiddleware, async (ctx) => {
  try {
    const { boardId, date } = ctx.params;
    const userId = ctx.state.userId!;

    // Verify board belongs to user
    const board = await getBoard(userId, boardId);
    if (!board) {
      return forbidden(ctx, "Access denied");
    }

    const log = await getLog(boardId, date);

    if (!log) {
      return notFound(ctx, "Log not found for this date");
    }

    success(ctx, log);
  } catch (err) {
    error(ctx, "Failed to fetch log: " + err.message, 500);
  }
});

// Create or update log entry
router.post("/api/logs", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.userId!;
    const body = await ctx.request.body();
    const { boardId, actions, date } = await body.value;

    if (!boardId || !actions) {
      return error(ctx, "boardId and actions are required");
    }

    // Verify board belongs to user
    const board = await getBoard(userId, boardId);
    if (!board) {
      return forbidden(ctx, "Access denied");
    }

    const logDate = date || new Date().toISOString().split("T")[0];

    // Check if log exists for this date
    const existingLog = (await getLog(boardId, logDate)) as Log | null;

    if (existingLog) {
      // Append new actions to existing log
      const updatedLog: Log = {
        ...existingLog,
        actions: [...existingLog.actions, ...actions],
        completedAt: new Date().toISOString(),
      };
      await setLog(boardId, logDate, updatedLog);
      success(ctx, updatedLog);
    } else {
      // Create new log
      const newLog: Log = {
        id: generateId(),
        boardId,
        userId,
        date: logDate,
        completedAt: new Date().toISOString(),
        actions,
      };
      await setLog(boardId, logDate, newLog);
      created(ctx, newLog);
    }
  } catch (err) {
    error(ctx, "Failed to create log: " + err.message, 500);
  }
});

// Delete log
router.delete("/api/logs/:id", authMiddleware, async (ctx) => {
  try {
    const logId = ctx.params.id;
    const userId = ctx.state.userId!;

    // Find the log across all boards
    const allBoards = await getBoard(userId, "");
    let foundLog = null;
    let foundBoardId = "";
    let foundDate = "";

    // Search through boards to find the log
    const logs = await getLogsByBoardId(logId);
    for (const log of logs) {
      if ((log as Log).id === logId) {
        foundLog = log;
        foundBoardId = (log as Log).boardId;
        foundDate = (log as Log).date;
        break;
      }
    }

    if (!foundLog) {
      return notFound(ctx, "Log not found");
    }

    // Verify board belongs to user
    const board = await getBoard(userId, foundBoardId);
    if (!board) {
      return forbidden(ctx, "Access denied");
    }

    await kvDeleteLog(foundBoardId, foundDate);
    noContent(ctx);
  } catch (err) {
    error(ctx, "Failed to delete log: " + err.message, 500);
  }
});

export default router;
