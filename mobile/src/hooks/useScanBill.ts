import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { uploadBillImage } from "../api/bills";
import { saveReceipt } from "../lib/history";
import { BILLS_QUERY_KEY } from "./useBillsQuery";
import { useToast } from "../contexts/ToastContext";
import type { RootStackParamList } from "../navigation/AppNavigator";

export function useScanBill(
  navigation: NativeStackNavigationProp<RootStackParamList>
) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSheet = useCallback(() => {
    setError(null);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (!uploading) setSheetVisible(false);
  }, [uploading]);

  async function handlePickedAsset(asset: ImagePicker.ImagePickerAsset) {
    setUploading(true);
    setError(null);

    try {
      const { id } = await uploadBillImage(asset);
      await saveReceipt({
        billId: id,
        restaurantName: "Receipt",
        imageUri: asset.uri,
      });
      void queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
      setSheetVisible(false);
      toast.success("Receipt uploaded! Reviewing bill...");
      navigation.navigate("BillReview", {
        billId: id,
        imageUri: asset.uri,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.warning("Camera access is needed to scan your bill.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!result.canceled) {
      await handlePickedAsset(result.assets[0]);
    }
  }

  async function chooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.warning("Photo library access is needed to upload a receipt.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!result.canceled) {
      await handlePickedAsset(result.assets[0]);
    }
  }

  return {
    sheetVisible,
    uploading,
    error,
    openSheet,
    closeSheet,
    takePhoto,
    chooseFromLibrary,
  };
}
