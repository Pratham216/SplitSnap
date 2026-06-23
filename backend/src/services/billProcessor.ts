import { Bill, IBill } from "../models/Bill";
import { runOcr, deleteTempFile } from "./ocr";
import { saveOcrDebug } from "./ocrDebug";
import { parseBillFromOcr, parseBillLocal } from "./parser";
import { isVisionSupportedImage, parseBillFromImage } from "./visionParser";
import { config } from "../config";
import type { ParsedBill } from "@splitsnap/shared";

function applyParsedBill(bill: IBill, parsed: ParsedBill, ocrText?: string) {
  bill.restaurantName = parsed.restaurantName;
  bill.billDate = parsed.billDate;
  bill.items = parsed.items.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
  bill.subtotal = parsed.subtotal;
  bill.tax = parsed.tax;
  bill.serviceCharge = parsed.serviceCharge;
  bill.grandTotal = parsed.grandTotal;
  if (ocrText !== undefined) bill.ocrText = ocrText;
  bill.status = "parsed";
  bill.errorMessage = undefined;
}

export async function processBill(billId: string): Promise<void> {
  const bill = await Bill.findById(billId);
  if (!bill || !bill.tempFilePath) {
    return;
  }

  bill.status = "processing";
  await bill.save();

  const filePath = bill.tempFilePath;

  try {
    let parsed: ParsedBill | null = null;
    let ocrText = "";

    // 1) Vision: send image directly to GPT-4o-mini
    if (
      config.parserMode === "vision" &&
      config.openRouterApiKey &&
      isVisionSupportedImage(filePath)
    ) {
      try {
        parsed = await parseBillFromImage(filePath);
      } catch (visionError) {
        console.warn(
          "Vision parse failed, falling back to OCR + local parser:",
          visionError instanceof Error ? visionError.message : visionError
        );
      }
    }

    // 2) Fallback: Tesseract OCR + local rules
    if (!parsed) {
      ocrText = await runOcr(filePath);
      await saveOcrDebug(bill._id.toString(), ocrText);
      parsed =
        config.parserMode === "openrouter" && config.openRouterApiKey
          ? await parseBillFromOcr(ocrText)
          : parseBillLocal(ocrText);
    } else {
      // Save OCR debug in background for vision path (non-blocking)
      runOcr(filePath)
        .then(async (text) => {
          await saveOcrDebug(bill._id.toString(), text, { logToConsole: false });
          await Bill.findByIdAndUpdate(bill._id, { ocrText: text });
        })
        .catch(() => undefined);
    }

    applyParsedBill(bill, parsed, ocrText || undefined);

    await deleteTempFile(filePath);
    bill.tempFilePath = undefined;
    bill.tempFileExpiresAt = undefined;
    await bill.save();
  } catch (error) {
    bill.status = "failed";
    bill.errorMessage =
      error instanceof Error ? error.message : "Bill processing failed";
    await bill.save();
  }
}

export function serializeBill(bill: IBill) {
  return {
    id: bill._id.toString(),
    restaurantName: bill.restaurantName,
    billDate: bill.billDate,
    items: bill.items.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    subtotal: bill.subtotal,
    tax: bill.tax,
    serviceCharge: bill.serviceCharge,
    grandTotal: bill.grandTotal,
    status: bill.status,
    errorMessage: bill.errorMessage,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  };
}
