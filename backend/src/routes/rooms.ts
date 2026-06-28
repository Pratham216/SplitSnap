import { Router } from "express";
import { requireAuth, requireUser } from "../middleware/auth";
import {
  createRoom,
  getRoomByCode,
  joinRoom,
  serializeRoom,
  serializeParticipant,
} from "../services/roomService";
import { getUserById } from "../services/userService";
import { Participant } from "../models/Participant";
import { getIo } from "../sockets/io";
import { setItemSelection } from "../services/selectionService";
import { updateHostUpi, markSelfPaid } from "../services/paymentService";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { billId, hostName, hostUpiId } = req.body;
    if (!billId) {
      res.status(400).json({ error: "billId is required" });
      return;
    }

    let resolvedHostName =
      typeof hostName === "string" && hostName.trim() ? hostName.trim() : "Host";
    let resolvedUpi =
      typeof hostUpiId === "string" && hostUpiId.trim()
        ? hostUpiId.trim()
        : undefined;

    if (req.auth?.type === "user") {
      const user = await getUserById(req.auth.userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (!hostName?.trim() && user.name) {
        resolvedHostName = user.name;
      }
      if (!resolvedUpi && user.upiId) {
        resolvedUpi = user.upiId;
      }
    }

    const room = await createRoom(
      billId,
      req.auth!.guestId,
      resolvedHostName,
      resolvedUpi
    );
    const data = await serializeRoom(room);
    res.status(201).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room";
    res.status(400).json({ error: message });
  }
});

router.get("/:code", async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(await serializeRoom(room));
});

router.post("/:code/selections", requireAuth, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    if (!itemId || typeof quantity !== "number") {
      res.status(400).json({ error: "itemId and quantity are required" });
      return;
    }

    const { room, participant, changed } = await setItemSelection(
      String(req.params.code),
      req.auth!.guestId,
      itemId,
      quantity
    );

    if (changed) {
      getIo().to(room.code).emit("item:selection-changed", {
        itemId,
        guestId: req.auth!.guestId,
        participantName: participant.name,
        quantity,
      });
    }

    res.json(await serializeRoom(room));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update selection";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.patch("/:code/upi", requireAuth, async (req, res) => {
  try {
    const { hostUpiId } = req.body;
    if (hostUpiId === undefined) {
      res.status(400).json({ error: "hostUpiId is required" });
      return;
    }

    const room = await updateHostUpi(
      String(req.params.code),
      req.auth!.guestId,
      String(hostUpiId)
    );

    getIo().to(room.code).emit("room:upi-updated", {
      hostUpiId: room.hostUpiId ?? "",
    });

    res.json(await serializeRoom(room));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update UPI ID";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.post("/:code/payments/mark-paid", requireAuth, async (req, res) => {
  try {
    const { room, participant } = await markSelfPaid(
      String(req.params.code),
      req.auth!.guestId
    );

    getIo().to(room.code).emit("payment:marked", {
      guestId: participant.guestId,
      participantName: participant.name,
    });

    res.json(await serializeRoom(room));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark payment";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.post("/:code/join", requireAuth, async (req, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const { room, participant } = await joinRoom(
      String(req.params.code),
      req.auth!.guestId,
      name,
      avatarUrl
    );

    const payload = serializeParticipant(participant, room);
    getIo().to(room.code).emit("participant:joined", payload);

    res.json({
      room: await serializeRoom(room),
      participant: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join room";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.delete("/:code/participants/me", requireAuth, async (req, res) => {
  const room = await getRoomByCode(String(req.params.code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const participant = await Participant.findOneAndDelete({
    roomId: room._id,
    guestId: req.auth!.guestId,
  });

  if (participant) {
    getIo().to(room.code).emit("participant:left", {
      id: participant._id.toString(),
      guestId: participant.guestId,
    });
  }

  res.json({ ok: true });
});

export default router;
