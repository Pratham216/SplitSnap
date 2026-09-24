import { Linking, Platform } from "react-native";

/**
 * Downloads or opens an image file cleanly across both Web (Blob URL download)
 * and Native (Linking to OS storage/viewer).
 *
 * @param imageUri - The image URL or local URI.
 * @param filenamePrefix - Prefix for the downloaded file (e.g. "receipt").
 * @param onToast - Optional callback to show toast notification.
 */
export async function downloadReceiptImage(
  imageUri: string,
  filenamePrefix = "receipt",
  onToast?: (message: string, isError?: boolean) => void
): Promise<void> {
  try {
    const cleanName = filenamePrefix
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 30);
    const filename = `${cleanName || "receipt"}-bill.jpg`;

    if (Platform.OS === "web") {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        onToast?.("Receipt downloaded successfully", false);
      } catch {
        const link = document.createElement("a");
        link.href = imageUri;
        link.download = filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onToast?.("Opened receipt image", false);
      }
      return;
    }

    if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
      const can = await Linking.canOpenURL(imageUri);
      if (can) {
        await Linking.openURL(imageUri);
        onToast?.("Receipt opened", false);
        return;
      }
    }

    onToast?.("Receipt image is available on your device", false);
  } catch (err) {
    onToast?.("Could not download receipt image", true);
  }
}
