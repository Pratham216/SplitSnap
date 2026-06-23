import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";

export interface GuestAuthPayload {
  guestId: string;
  type: "guest";
}

export interface UserAuthPayload {
  guestId: string;
  userId: string;
  clerkId: string;
  type: "user";
}

export type AuthPayload = GuestAuthPayload | UserAuthPayload;

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signGuestToken(guestId: string): string {
  return jwt.sign({ guestId, type: "guest" }, config.jwtSecret, {
    expiresIn: "7d",
  });
}

export function signUserToken(payload: {
  guestId: string;
  userId: string;
  clerkId: string;
}): string {
  return jwt.sign(
    { ...payload, type: "user" },
    config.jwtSecret,
    { expiresIn: "30d" }
  );
}

export function createGuestSession(): { guestId: string; token: string } {
  const guestId = uuidv4();
  return { guestId, token: signGuestToken(guestId) };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const token = header.slice(7);
      req.auth = jwt.verify(token, config.jwtSecret) as AuthPayload;
    } catch {
      // ignore invalid token
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const token = header.slice(7);
    req.auth = jwt.verify(token, config.jwtSecret) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.type !== "user") {
      res.status(401).json({ error: "Host account required" });
      return;
    }
    next();
  });
}
