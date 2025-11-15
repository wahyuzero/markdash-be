// src/routes/auth.ts
import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import type { User } from "../types.ts";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateId,
} from "../utils/crypto.ts";
import { getUserByUsername, setUser, getUserById } from "../utils/kv.ts";
import { success, error, created, noContent } from "../utils/response.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";

const router = new Router();

// Register new user
router.post("/api/register", async (ctx) => {
  try {
    const body = await ctx.request.body();
    const { username, password } = await body.value;

    if (!username || !password) {
      return error(ctx, "Username and password are required");
    }

    if (password.length < 6) {
      return error(ctx, "Password must be at least 6 characters");
    }

    // Check if user already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return error(ctx, "Username already exists", 409);
    }

    // Create new user
    const userId = generateId();
    const passwordHash = hashPassword(password); // Now sync, no await needed

    const newUser: User = {
      id: userId,
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await setUser(userId, newUser);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    created(ctx, {
      message: "User created successfully",
      user: userWithoutPassword,
    });
  } catch (err) {
    error(ctx, "Registration failed: " + err.message, 500);
  }
});

// Login user
router.post("/api/login", async (ctx) => {
  try {
    const body = await ctx.request.body();
    const { username, password } = await body.value;

    if (!username || !password) {
      return error(ctx, "Username and password are required");
    }

    // Find user
    const user = (await getUserByUsername(username)) as User | null;
    if (!user) {
      return error(ctx, "Invalid username or password", 401);
    }

    // Verify password
    const isValid = verifyPassword(password, user.passwordHash); // Now sync, no await needed
    if (!isValid) {
      return error(ctx, "Invalid username or password", 401);
    }

    // Generate token
    const token = await generateToken(user.id, user.username);

    // Return token and user info
    const { passwordHash: _, ...userWithoutPassword } = user;
    success(ctx, {
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    error(ctx, "Login failed: " + err.message, 500);
  }
});

// Get current user info
router.get("/api/me", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.userId;
    const user = (await getUserById(userId)) as User | null;

    if (!user) {
      return error(ctx, "User not found", 404);
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    success(ctx, userWithoutPassword);
  } catch (err) {
    error(ctx, "Failed to get user info: " + err.message, 500);
  }
});

// Logout (client-side will remove token)
router.post("/api/logout", authMiddleware, (ctx) => {
  noContent(ctx);
});

export default router;
