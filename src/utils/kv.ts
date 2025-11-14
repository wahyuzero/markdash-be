// src/utils/kv.ts

let kv: Deno.Kv;

export async function initKV() {
  kv = await Deno.openKv();
  return kv;
}

export function getKV() {
  if (!kv) {
    throw new Error("KV not initialized. Call initKV() first.");
  }
  return kv;
}

// User operations
export async function getUserById(id: string) {
  const result = await getKV().get(["user", id]);
  return result.value;
}

export async function getUserByUsername(username: string) {
  const result = await getKV().get(["user_by_username", username]);
  if (!result.value) return null;
  return await getUserById(result.value as string);
}

export async function setUser(id: string, user: any) {
  const kv = getKV();
  await kv.set(["user", id], user);
  await kv.set(["user_by_username", user.username], id);
}

// Board operations
export async function getBoard(userId: string, boardId: string) {
  const result = await getKV().get(["board", userId, boardId]);
  return result.value;
}

export async function getBoardsByUserId(userId: string) {
  const boards = [];
  const iter = getKV().list({ prefix: ["board", userId] });
  for await (const entry of iter) {
    boards.push(entry.value);
  }
  return boards;
}

export async function setBoard(userId: string, boardId: string, board: any) {
  await getKV().set(["board", userId, boardId], board);
}

export async function deleteBoard(userId: string, boardId: string) {
  await getKV().delete(["board", userId, boardId]);
}

// Public board access
export async function getPublicBoard(boardId: string) {
  const iter = getKV().list({ prefix: ["board"] });
  for await (const entry of iter) {
    const board = entry.value as any;
    if (board.id === boardId && board.visibility === "public") {
      return board;
    }
  }
  return null;
}

// Log operations
export async function getLog(boardId: string, date: string) {
  const result = await getKV().get(["log", boardId, date]);
  return result.value;
}

export async function getLogsByBoardId(boardId: string) {
  const logs = [];
  const iter = getKV().list({ prefix: ["log", boardId] });
  for await (const entry of iter) {
    logs.push(entry.value);
  }
  return logs;
}

export async function setLog(boardId: string, date: string, log: any) {
  await getKV().set(["log", boardId, date], log);
}

export async function deleteLog(boardId: string, date: string) {
  await getKV().delete(["log", boardId, date]);
}

// Notification operations
export async function getNotification(boardId: string, notifId: string) {
  const result = await getKV().get(["notif", boardId, notifId]);
  return result.value;
}

export async function getNotificationsByBoardId(boardId: string) {
  const notifs = [];
  const iter = getKV().list({ prefix: ["notif", boardId] });
  for await (const entry of iter) {
    notifs.push(entry.value);
  }
  return notifs;
}

export async function setNotification(
  boardId: string,
  notifId: string,
  notif: any,
) {
  await getKV().set(["notif", boardId, notifId], notif);
}

export async function deleteNotification(boardId: string, notifId: string) {
  await getKV().delete(["notif", boardId, notifId]);
}
