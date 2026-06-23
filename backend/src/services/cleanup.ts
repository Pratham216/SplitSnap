import fs from "fs/promises";
import path from "path";
import { Bill } from "../models/Bill";
import { config } from "../config";
import { deleteTempFile } from "./ocr";

export async function cleanupExpiredTempFiles(): Promise<void> {
  const now = new Date();

  const expiredBills = await Bill.find({
    tempFilePath: { $exists: true, $ne: null },
    tempFileExpiresAt: { $lte: now },
  });

  for (const bill of expiredBills) {
    await deleteTempFile(bill.tempFilePath);
    bill.tempFilePath = undefined;
    bill.tempFileExpiresAt = undefined;
    await bill.save();
  }

  const tempDir = path.resolve(process.cwd(), config.tempDir);
  try {
    const files = await fs.readdir(tempDir);
    const cutoff = Date.now() - config.tempFileTtlMs;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(filePath).catch(() => undefined);
      }
    }
  } catch {
    // temp dir may not exist yet
  }
}

export function startCleanupScheduler(): void {
  const intervalMs = 5 * 60 * 1000;
  setInterval(() => {
    cleanupExpiredTempFiles().catch((err) =>
      console.error("Temp file cleanup failed:", err)
    );
  }, intervalMs);
}
