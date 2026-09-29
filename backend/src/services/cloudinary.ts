import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";

let isConfigured = false;

if (config.cloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: config.cloudinaryUrl,
  });
  isConfigured = true;
} else if (
  config.cloudinaryCloudName &&
  config.cloudinaryApiKey &&
  config.cloudinaryApiSecret
) {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
  });
  isConfigured = true;
}

export function isCloudinaryConfigured(): boolean {
  return isConfigured;
}

/**
 * Uploads a local receipt file to Cloudinary and returns its secure CDN URL.
 * Returns null if Cloudinary is not configured or if upload fails.
 */
export async function uploadReceiptToCloudinary(
  filePath: string
): Promise<string | null> {
  if (!isConfigured) {
    return null;
  }
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "zaptab_receipts",
      resource_type: "image",
    });
    return result.secure_url;
  } catch (error) {
    console.error("[Cloudinary] Upload failed:", error);
    return null;
  }
}
