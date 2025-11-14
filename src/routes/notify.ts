// src/routes/notify.ts
import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import type { Notification } from "../types.ts";
import { generateId } from "../utils/crypto.ts";
import {
  getNotification,
  getNotificationsByBoardId,
  setNotification,
  deleteNotification as kvDeleteNotification,
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

// Get all notifications for a board
router.get("/api/notify/:boardId", authMiddleware, async (ctx) => {
  try {
    const boardId = ctx.params.boardId;
    const userId = ctx.state.userId!;

    // Verify board belongs to user
    const board = await getBoard(userId, boardId);
    if (!board) {
      return forbidden(ctx, "Access denied");
    }

    const notifications = await getNotificationsByBoardId(boardId);

    // Filter only active (non-dismissed) notifications
    const activeNotifications = (notifications as Notification[]).filter(
      (n) => !n.dismissed,
    );

    success(ctx, activeNotifications);
  } catch (err) {
    error(ctx, "Failed to fetch notifications: " + err.message, 500);
  }
});

// Create new notification
router.post("/api/notify", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.userId!;
    const body = await ctx.request.body();
    const { boardId, message, time } = await body.value;

    if (!boardId || !message || !time) {
      return error(ctx, "boardId, message, and time are required");
    }

    // Verify board belongs to user
    const board = await getBoard(userId, boardId);
    if (!board) {
      return forbidden(ctx, "Access denied");
    }

    const notifId = generateId();

    const newNotification: Notification = {
      id: notifId,
      boardId,
      userId,
      message,
      time,
      dismissed: false,
    };

    await setNotification(boardId, notifId, newNotification);
    created(ctx, newNotification);
  } catch (err) {
    error(ctx, "Failed to create notification: " + err.message, 500);
  }
});

// Dismiss notification
router.patch("/api/notify/:id/dismiss", authMiddleware, async (ctx) => {
  try {
    const notifId = ctx.params.id;
    const userId = ctx.state.userId!;

    // Find notification across all boards
    let foundNotif: Notification | null = null;
    let foundBoardId = "";

    // Search through user's boards
    const allNotifications = await getNotificationsByBoardId("");
    for (const notif of allNotifications) {
      const n = notif as Notification;
      if (n.id === notifId && n.userId === userId) {
        foundNotif = n;
        foundBoardId = n.boardId;
        break;
      }
    }

    if (!foundNotif) {
      return notFound(ctx, "Notification not found");
    }

    // Update notification
    const updatedNotif: Notification = {
      ...foundNotif,
      dismissed: true,
    };

    await setNotification(foundBoardId, notifId, updatedNotif);
    success(ctx, updatedNotif);
  } catch (err) {
    error(ctx, "Failed to dismiss notification: " + err.message, 500);
  }
});

// Delete notification
router.delete("/api/notify/:id", authMiddleware, async (ctx) => {
  try {
    const notifId = ctx.params.id;
    const userId = ctx.state.userId!;

    // Find notification across all boards
    let foundNotif: Notification | null = null;
    let foundBoardId = "";

    // Search through user's boards
    const allNotifications = await getNotificationsByBoardId("");
    for (const notif of allNotifications) {
      const n = notif as Notification;
      if (n.id === notifId && n.userId === userId) {
        foundNotif = n;
        foundBoardId = n.boardId;
        break;
      }
    }

    if (!foundNotif) {
      return notFound(ctx, "Notification not found");
    }

    await kvDeleteNotification(foundBoardId, notifId);
    noContent(ctx);
  } catch (err) {
    error(ctx, "Failed to delete notification: " + err.message, 500);
  }
});

export default router;
