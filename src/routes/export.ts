// src/routes/export.ts
// BONUS FEATURE: Export board to Markdown or CSV

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import type { Board, Log } from "../types.ts";
import { getBoard, getLogsByBoardId } from "../utils/kv.ts";
import { error, notFound, forbidden } from "../utils/response.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";

const router = new Router();

// Export board as Markdown
router.get("/api/export/:boardId/markdown", authMiddleware, async (ctx) => {
  try {
    const boardId = ctx.params.boardId;
    const userId = ctx.state.userId!;

    const board = (await getBoard(userId, boardId)) as Board | null;

    if (!board) {
      return notFound(ctx, "Board not found");
    }

    // Get all logs for this board
    const logs = (await getLogsByBoardId(boardId)) as Log[];

    // Generate markdown export
    let markdown = `# ${board.title}\n\n`;
    markdown += `**Created:** ${new Date(board.createdAt).toLocaleDateString()}\n`;
    markdown += `**Schedule:** ${board.schedule}\n`;
    markdown += `**Reset Time:** ${board.resetTime}\n\n`;
    markdown += `---\n\n`;
    markdown += `## Board Content\n\n`;
    markdown += board.markdown;
    markdown += `\n\n---\n\n`;
    markdown += `## Activity History\n\n`;

    if (logs.length === 0) {
      markdown += `No activity recorded yet.\n`;
    } else {
      logs.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      for (const log of logs) {
        markdown += `### ${log.date}\n\n`;

        for (const action of log.actions) {
          const time = new Date(action.time).toLocaleTimeString();

          if (action.type === "check" && action.task) {
            markdown += `- ✓ **${time}** - Completed: ${action.task}\n`;
          } else if (action.type === "reset") {
            markdown += `- 🔄 **${time}** - Board reset\n`;
          } else if (action.type === "done") {
            markdown += `- ✅ **${time}** - Board completed\n`;
          }
        }

        markdown += `\n`;
      }
    }

    markdown += `\n---\n\n`;
    markdown += `*Exported from MarkDash on ${new Date().toLocaleString()}*\n`;

    // Set response headers for file download
    ctx.response.headers.set("Content-Type", "text/markdown");
    ctx.response.headers.set(
      "Content-Disposition",
      `attachment; filename="${board.title.replace(/[^a-z0-9]/gi, "_")}.md"`,
    );
    ctx.response.body = markdown;
  } catch (err) {
    error(ctx, "Failed to export board: " + err.message, 500);
  }
});

// Export board as CSV
router.get("/api/export/:boardId/csv", authMiddleware, async (ctx) => {
  try {
    const boardId = ctx.params.boardId;
    const userId = ctx.state.userId!;

    const board = (await getBoard(userId, boardId)) as Board | null;

    if (!board) {
      return notFound(ctx, "Board not found");
    }

    // Get all logs for this board
    const logs = (await getLogsByBoardId(boardId)) as Log[];

    // Generate CSV export
    let csv = `Date,Time,Action Type,Task,Board\n`;

    if (logs.length > 0) {
      logs.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      for (const log of logs) {
        for (const action of log.actions) {
          const date = log.date;
          const time = new Date(action.time).toLocaleTimeString();
          const type = action.type;
          const task = action.task || "-";
          const boardTitle = board.title.replace(/"/g, '""'); // Escape quotes

          csv += `"${date}","${time}","${type}","${task}","${boardTitle}"\n`;
        }
      }
    }

    // Set response headers for file download
    ctx.response.headers.set("Content-Type", "text/csv");
    ctx.response.headers.set(
      "Content-Disposition",
      `attachment; filename="${board.title.replace(/[^a-z0-9]/gi, "_")}_logs.csv"`,
    );
    ctx.response.body = csv;
  } catch (err) {
    error(ctx, "Failed to export board: " + err.message, 500);
  }
});

// Export all boards as JSON
router.get("/api/export/all/json", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.userId!;

    // This would need to be implemented to get all user boards
    // For now, return a placeholder

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: userId,
      },
      boards: [], // Would fetch all boards here
      logs: [], // Would fetch all logs here
    };

    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.headers.set(
      "Content-Disposition",
      `attachment; filename="markdash_export_${Date.now()}.json"`,
    );
    ctx.response.body = JSON.stringify(exportData, null, 2);
  } catch (err) {
    error(ctx, "Failed to export data: " + err.message, 500);
  }
});

export default router;
