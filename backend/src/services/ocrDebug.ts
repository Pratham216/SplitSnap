import fs from "fs/promises";
import path from "path";
import { config } from "../config";

export async function saveOcrDebug(
  billId: string,
  ocrText: string,
  options?: { logToConsole?: boolean }
): Promise<string> {
  const logToConsole = options?.logToConsole ?? true;
  const dir = path.resolve(process.cwd(), config.ocrDebugDir);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${billId}-${Date.now()}.txt`;
  const filePath = path.join(dir, filename);

  await fs.writeFile(filePath, ocrText, "utf-8");

  if (logToConsole) {
    console.log("\n========== OCR EXTRACTED TEXT (used for parsing) ==========");
    console.log(`Bill ID: ${billId}`);
    console.log(`Saved to: ${filePath}`);
    console.log("----------------------------------------");
    console.log(ocrText || "(empty)");
    console.log("============================================================\n");
  } else {
    console.log(
      `OCR debug saved (not used — vision parsed the image): ${filePath}`
    );
  }

  return filePath;
}
