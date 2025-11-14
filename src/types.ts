// src/types.ts

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface Board {
  id: string;
  userId: string;
  title: string;
  markdown: string;
  visibility: "private" | "public";
  schedule: "daily" | "weekly" | "custom";
  resetTime: string; // e.g. "00:00"
  createdAt: string;
  updatedAt: string;
}

export interface LogAction {
  type: "check" | "reset" | "done";
  task?: string;
  time: string;
}

export interface Log {
  id: string;
  boardId: string;
  userId: string;
  date: string;
  completedAt: string;
  actions: LogAction[];
}

export interface Notification {
  id: string;
  boardId: string;
  userId: string;
  message: string;
  time: string;
  dismissed: boolean;
}

export interface JWTPayload {
  userId: string;
  username: string;
  exp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RouterContext {
  state: {
    userId?: string;
    username?: string;
  };
}
