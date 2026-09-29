import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Bill } from "../models/Bill";
import { Room } from "../models/Room";
import { ensureTempDir, deleteTempFile } from "../services/ocr";
import { processBill, serializeBill } from "../services/billProcessor";
import { config } from "../config";

import { optionalAuth } from "../middleware/auth";

const router = Router();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const dir = await ensureTempDir();
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP) are allowed"));
    }
  },
});

router.post("/upload", optionalAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const expiresAt = new Date(Date.now() + config.tempFileTtlMs);
    const createdByClerkId = req.auth?.type === "user" ? req.auth.clerkId : undefined;
    const createdByGuestId = req.auth?.guestId;

    const bill = await Bill.create({
      status: "processing",
      imagePath: req.file.path,
      tempFilePath: req.file.path,
      tempFileExpiresAt: expiresAt,
      items: [],
      createdByClerkId,
      createdByGuestId,
    });

    processBill(bill._id.toString()).catch((err) =>
      console.error("Bill processing error:", err)
    );

    res.status(201).json({
      id: bill._id.toString(),
      status: bill.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

router.get("/recent", optionalAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.type === "user" ? req.auth.clerkId : null;
    const guestId = req.auth?.guestId || null;

    if (!clerkId && !guestId) {
      res.json([]);
      return;
    }

    const conditions: any[] = [];
    if (clerkId) conditions.push({ createdByClerkId: clerkId });
    if (guestId) conditions.push({ createdByGuestId: guestId });

    const bills = await Bill.find({ $or: conditions })
      .sort({ createdAt: -1 })
      .limit(25);

    const billIds = bills.map((b) => b._id);
    const rooms = await Room.find({ billId: { $in: billIds } }).sort({ createdAt: -1 });
    const roomMap = new Map<string, string>();
    for (const r of rooms) {
      if (!roomMap.has(r.billId.toString())) {
        roomMap.set(r.billId.toString(), r.code);
      }
    }

    const serialized = bills.map((b) => ({
      ...serializeBill(b),
      roomCode: roomMap.get(b._id.toString()),
    }));

    res.json(serialized);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recent bills" });
  }
});

router.get("/:id", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  const room = await Room.findOne({ billId: bill._id }).sort({ createdAt: -1 });
  res.json({
    ...serializeBill(bill),
    roomCode: room?.code,
  });
});

router.get("/:id/image", async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    const filePath = bill.imagePath || bill.tempFilePath;
    if (!filePath) {
      res.status(404).json({ error: "Image not found for this bill" });
      return;
    }

    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: "Image file no longer exists" });
      return;
    }

    res.sendFile(resolved);
  } catch (error) {
    res.status(500).json({ error: "Failed to load bill image" });
  }
});

router.get("/:id/status", async (req, res) => {
  const bill = await Bill.findById(req.params.id).select(
    "status errorMessage updatedAt"
  );
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.json({
    status: bill.status,
    errorMessage: bill.errorMessage,
    updatedAt: bill.updatedAt,
  });
});

router.patch("/:id", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const {
    restaurantName,
    billDate,
    taxes,
    serviceCharge,
    subtotal,
    grandTotal,
    isManuallyModified,
  } = req.body;

  if (restaurantName !== undefined) bill.restaurantName = restaurantName;
  if (billDate !== undefined) bill.billDate = billDate;
  if (Array.isArray(taxes)) bill.taxes = taxes;
  if (serviceCharge !== undefined) bill.serviceCharge = Number(serviceCharge);
  if (subtotal !== undefined) bill.subtotal = Number(subtotal);
  if (grandTotal !== undefined) bill.grandTotal = Number(grandTotal);
  if (isManuallyModified !== undefined) bill.isManuallyModified = Boolean(isManuallyModified);

  await bill.save();
  res.json(serializeBill(bill));
});

router.post("/:id/items", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const { name, price, quantity = 1 } = req.body;
  if (price === undefined) {
    res.status(400).json({ error: "price is required" });
    return;
  }

  bill.items.push({
    name: name ?? "",
    price: Number(price),
    quantity: Number(quantity),
  });
  await bill.save();
  res.json(serializeBill(bill));
});

router.patch("/:id/items/:itemId", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const item = bill.items.id(req.params.itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const { name, price, quantity } = req.body;
  if (name !== undefined) item.name = name;
  if (price !== undefined) item.price = Number(price);
  if (quantity !== undefined) item.quantity = Number(quantity);

  await bill.save();
  res.json(serializeBill(bill));
});

router.delete("/:id/items/:itemId", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const item = bill.items.id(req.params.itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  item.deleteOne();
  await bill.save();
  res.json(serializeBill(bill));
});

router.post("/:id/retry", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  if (!bill.tempFilePath) {
    res.status(400).json({
      error: "Original image was already deleted. Please upload again.",
    });
    return;
  }

  bill.status = "processing";
  bill.errorMessage = undefined;
  await bill.save();

  processBill(bill._id.toString()).catch((err) =>
    console.error("Bill retry error:", err)
  );

  res.json({ id: bill._id.toString(), status: bill.status });
});

router.delete("/:id", async (req, res) => {
  const bill = await Bill.findByIdAndDelete(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  await Room.deleteMany({ billId: bill._id }).catch(() => {});
  if (bill.tempFilePath) {
    await deleteTempFile(bill.tempFilePath).catch(() => {});
  }
  res.json({ success: true, id: req.params.id });
});

export default router;
