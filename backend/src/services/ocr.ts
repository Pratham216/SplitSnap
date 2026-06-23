import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { config } from "../config";

const execFileAsync = promisify(execFile);

export async function ensureTempDir(): Promise<string> {
  const dir = path.resolve(process.cwd(), config.tempDir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function preprocessImage(inputPath: string): Promise<string> {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === ".pdf") {
    return inputPath;
  }

  const outputPath = inputPath.replace(/\.[^.]+$/, "_processed.png");
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toFile(outputPath);

  return outputPath;
}

export async function runOcr(imagePath: string): Promise<string> {
  const ext = path.extname(imagePath).toLowerCase();

  if (ext === ".pdf") {
    throw new Error(
      "PDF OCR is not supported yet. Please upload a JPG or PNG receipt image."
    );
  }

  const processedPath = await preprocessImage(imagePath);

  try {
    const { stdout } = await execFileAsync(config.tesseractPath, [
      processedPath,
      "stdout",
      "-l",
      "eng",
      "--psm",
      "6",
    ]);

    return stdout.trim();
  } finally {
    if (processedPath !== imagePath) {
      await fs.unlink(processedPath).catch(() => undefined);
    }
  }
}

export async function deleteTempFile(filePath?: string): Promise<void> {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => undefined);
}
