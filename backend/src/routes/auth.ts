import { Router } from "express";
import {
  createGuestSession,
  requireAuth,
  requireUser,
  signUserToken,
} from "../middleware/auth";
import { verifyClerkToken } from "../services/clerk";
import {
  findOrCreateUserFromClerk,
  serializeUser,
  updateUserUpi,
  getUserById,
} from "../services/userService";

const router = Router();

router.post("/guest", (_req, res) => {
  const session = createGuestSession();
  res.json(session);
});

router.post("/sync", async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Clerk token required" });
      return;
    }

    const clerkToken = header.slice(7);
    const identity = await verifyClerkToken(clerkToken);
    if (!identity) {
      res.status(401).json({ error: "Invalid Clerk token" });
      return;
    }

    const user = await findOrCreateUserFromClerk(identity);
    const token = signUserToken({
      guestId: user.participantGuestId,
      userId: user._id.toString(),
      clerkId: user.clerkId,
    });

    res.json({
      token,
      guestId: user.participantGuestId,
      user: serializeUser(user),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync account";
    res.status(500).json({ error: message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  if (req.auth?.type === "user") {
    res.json({
      guestId: req.auth.guestId,
      type: "user",
      userId: req.auth.userId,
      clerkId: req.auth.clerkId,
    });
    return;
  }

  res.json({ guestId: req.auth!.guestId, type: "guest" });
});

export default router;

export const usersRouter = Router();

usersRouter.get("/me", requireUser, async (req, res) => {
  const auth = req.auth;
  if (auth?.type !== "user") {
    res.status(401).json({ error: "Host account required" });
    return;
  }
  const user = await getUserById(auth.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

usersRouter.patch("/me/upi", requireUser, async (req, res) => {
  try {
    const auth = req.auth;
    if (auth?.type !== "user") {
      res.status(401).json({ error: "Host account required" });
      return;
    }
    const { upiId } = req.body;
    if (upiId === undefined) {
      res.status(400).json({ error: "upiId is required" });
      return;
    }

    const user = await updateUserUpi(auth.userId, String(upiId));
    res.json(serializeUser(user));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update UPI ID";
    res.status(400).json({ error: message });
  }
});
