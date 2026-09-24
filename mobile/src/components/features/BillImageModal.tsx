import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "../ui/Button";
import { downloadReceiptImage } from "../../lib/fileUtils";
import { formatMoney, formatSavedAt } from "../../lib/formatters";
import type { ReceiptEntry } from "../../lib/history";
import { colors, fontSize, radius, spacing } from "../../theme";

export interface BillImageModalProps {
  /** Visibility state of the modal */
  visible: boolean;
  /** The receipt data associated with this image */
  receipt: ReceiptEntry;
  /** Image URL or local URI */
  imageUri: string;
  /** Close handler */
  onClose: () => void;
  /** Optional toast notification callback */
  onDownloadToast?: (message: string, isError?: boolean) => void;
}

/**
 * BillImageModal displays a full-screen preview of a scanned bill receipt image
 * with quick download and inspection affordances.
 */
export default function BillImageModal({
  visible,
  receipt,
  imageUri,
  onClose,
  onDownloadToast,
}: BillImageModalProps) {
  const [loadingImg, setLoadingImg] = useState(true);

  const handleDownload = () => {
    void downloadReceiptImage(imageUri, receipt.restaurantName, onDownloadToast);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {receipt.restaurantName || "Receipt"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {formatMoney(receipt.total)} · {formatSavedAt(receipt.savedAt)}
              </Text>
            </View>
            <View style={styles.modalHeaderActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalDownloadChip,
                  pressed && styles.chipPressed,
                ]}
                onPress={handleDownload}
                accessibilityRole="button"
                accessibilityLabel="Download image"
              >
                <Ionicons
                  name="download-outline"
                  size={15}
                  color={colors.onGold}
                />
                <Text style={styles.modalDownloadChipText}>Download</Text>
              </Pressable>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.modalImageWrap}>
            {loadingImg ? (
              <ActivityIndicator
                size="large"
                color={colors.gold}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Image
              source={{ uri: imageUri }}
              style={styles.modalFullImage}
              resizeMode="contain"
              onLoadStart={() => setLoadingImg(true)}
              onLoadEnd={() => setLoadingImg(false)}
            />
          </View>

          <View style={styles.modalFooter}>
            <Button
              label="Download receipt image"
              variant="primary"
              fullWidth
              onPress={handleDownload}
            />
            <Button
              label="Close"
              variant="secondary"
              fullWidth
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalContent: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  modalHeaderInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: colors.gold,
    fontSize: fontSize.xs,
    marginTop: 2,
    fontWeight: "600",
  },
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalDownloadChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  modalDownloadChipText: {
    color: colors.onGold,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  chipPressed: {
    opacity: 0.85,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalImageWrap: {
    width: "100%",
    height: 380,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  modalFullImage: {
    width: "100%",
    height: "100%",
  },
  modalFooter: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
