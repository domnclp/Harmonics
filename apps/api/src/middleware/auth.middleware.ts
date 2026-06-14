import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
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

type VerifiedTokenUser = {
  id: string;
  email: string;
  name: string | null;
};

type SupabaseJwtPayload = {
  sub?: string;
  email?: string;
  exp?: number;
  user_metadata?: Record<string, unknown>;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

const getProfileName = (metadata?: Record<string, unknown>) =>
  typeof metadata?.name === "string"
    ? metadata.name
    : typeof metadata?.full_name === "string"
      ? metadata.full_name
      : null;

const decodeBase64UrlJson = <T>(value: string): T => JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;

const verifyTokenLocally = (token: string): VerifiedTokenUser | null => {
  if (!env.SUPABASE_JWT_SECRET) return null;

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const expectedSignature = createHmac("sha256", env.SUPABASE_JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const actualSignature = Buffer.from(encodedSignature, "base64url");

    if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) return null;

    const payload = decodeBase64UrlJson<SupabaseJwtPayload>(encodedPayload);
    if (!payload.sub || !payload.email || !payload.exp || payload.exp * 1000 <= Date.now()) return null;

    return {
      id: payload.sub,
      email: payload.email,
      name: getProfileName(payload.user_metadata)
    };
  } catch {
    return null;
  }
};

const verifyTokenWithSupabase = async (token: string): Promise<VerifiedTokenUser> => {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    throw new AppError(401, "Invalid or expired session");
  }

  return {
    id: data.user.id,
    email: data.user.email,
    name: getProfileName(data.user.user_metadata)
  };
};

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

    const verifiedUser = verifyTokenLocally(token) ?? await verifyTokenWithSupabase(token);

    const user = await prisma.user.upsert({
      where: { id: verifiedUser.id },
      update: {
        email: verifiedUser.email,
        name: verifiedUser.name
      },
      create: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        name: verifiedUser.name
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
