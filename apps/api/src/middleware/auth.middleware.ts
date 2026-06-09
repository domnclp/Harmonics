import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { AppError } from "./error.middleware.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const authCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const authCacheTtlMs = 2 * 60 * 1000;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new AppError(401, "Missing bearer token");
    }

    const cached = authCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      req.authUser = cached.user;
      next();
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user?.email) {
      throw new AppError(401, "Invalid or expired session");
    }

    const profileName =
      typeof data.user.user_metadata?.name === "string"
        ? data.user.user_metadata.name
        : typeof data.user.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name
          : null;

    const user = await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        email: data.user.email,
        name: profileName
      },
      create: {
        id: data.user.id,
        email: data.user.email,
        name: profileName
      }
    });

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    authCache.set(token, { user: authUser, expiresAt: Date.now() + authCacheTtlMs });
    req.authUser = authUser;

    next();
  } catch (error) {
    next(error);
  }
};
