import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ActionChip from "../ui/ActionChip";
import { getBillImageUrl } from "../../api/bills";
import { useToast } from "../../contexts/ToastContext";
import { formatMoney, formatSavedAt } from "../../lib/formatters";
import type { ReceiptEntry } from "../../lib/history";
import { colors, fontSize, radius, spacing } from "../../theme";

export interface ReceiptCardProps {
  /** The saved receipt item */
  receipt: ReceiptEntry;
  /** Whether this bill is actively creating a split room */
  splitting: boolean;
  /** Handler to initiate or open split room */
  onSplit: () => void;
  /** Handler to open BillReview screen */
  onEdit: () => void;
  /** Handler to trigger deletion modal */
  onRemove: () => void;
  /** Handler to open full image preview */
  onOpenImage: (imageUri: string) => void;
}

/**
 * ReceiptCard displays a captured receipt entry with thumbnail,
 * restaurant name, date, total amount, and quick action chips.
 */
export default function ReceiptCard({
  receipt,
  splitting,
  onSplit,
  onEdit,
  onRemove,
  onOpenImage,
}: ReceiptCardProps) {
  const toast = useToast();
  const imageSource =
    receipt.imageUri ||
    receipt.imageUrl ||
    getBillImageUrl(receipt.billId);

  const [hasError, setHasError] = useState(false);
  const showImage = Boolean(imageSource && !hasError);

  const handleThumbPress = () => {
    if (showImage && imageSource) {
      onOpenImage(imageSource);
    } else {
      toast.warning("Original receipt image is not available for this bill.");
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Pressable
          onPress={handleThumbPress}
          style={({ pressed }) => [
            styles.thumb,
            showImage && styles.thumbWithImage,
            pressed && styles.thumbPressed,
          ]}
          accessibilityLabel="View receipt image"
          accessibilityRole="button"
        >
          {showImage ? (
            <>
              <Image
                source={{ uri: imageSource }}
                style={styles.thumbImage}
                resizeMode="cover"
                onError={() => setHasError(true)}
              />
              <View style={styles.thumbBadge}>
                <Ionicons name="expand-outline" size={11} color="#FFFFFF" />
              </View>
            </>
          ) : (
            <Ionicons name="document-text" size={24} color={colors.textMuted} />
          )}
        </Pressable>

        <View style={styles.cardInfo}>
          <Text style={styles.storeName} numberOfLines={1}>
            {receipt.restaurantName || "Untitled bill"}
          </Text>
          <Text style={styles.date}>{formatSavedAt(receipt.savedAt)}</Text>
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amount}>{formatMoney(receipt.total)}</Text>
          {receipt.roomCode ? (
            <Text style={styles.roomCode}>{receipt.roomCode}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <ActionChip
          label={splitting ? "splitting…" : "split it"}
          icon="people"
          color={colors.success}
          onPress={onSplit}
          disabled={splitting}
        />
        <ActionChip
          label="edit"
          icon="pencil"
          color="#3B82F6"
          onPress={onEdit}
        />
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete bill"
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  thumbWithImage: {
    borderColor: colors.goldBorder,
  },
  thumbPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: radius.pill,
    padding: 3,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  amountBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    color: colors.success,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  roomCode: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  removeBtn: {
    marginLeft: "auto",
    padding: spacing.xs,
  },
});
