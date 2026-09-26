import React, { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBillImageUrl } from "../../api/bills";
import { useToast } from "../../contexts/ToastContext";
import { formatMoney, formatSavedAt } from "../../lib/formatters";
import type { ReceiptEntry } from "../../lib/history";
import { colors, fontSize, radius, spacing } from "../../theme";
import { goldGlowShadow } from "../../lib/platformStyles";

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
 * ReceiptCard displays a captured receipt entry with a luxury dark theme,
 * elegant thumbnail, live split badge, rich typography, and action buttons.
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
  const serverImageUrl = getBillImageUrl(receipt.billId);
  const rawUri = receipt.imageUri || receipt.imageUrl;
  const isBlobUri = rawUri ? rawUri.startsWith("blob:") : false;
  const initialSource = !isBlobUri && rawUri ? rawUri : serverImageUrl;
  const [currentSource, setCurrentSource] = useState<string>(initialSource);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    const nextRaw = receipt.imageUri || receipt.imageUrl;
    const nextIsBlob = nextRaw ? nextRaw.startsWith("blob:") : false;
    const nextSource = !nextIsBlob && nextRaw ? nextRaw : serverImageUrl;
    setCurrentSource(nextSource);
    setHasError(false);
  }, [receipt.imageUri, receipt.imageUrl, serverImageUrl]);

  const handleImageError = () => {
    if (currentSource !== serverImageUrl) {
      setCurrentSource(serverImageUrl);
    } else {
      setHasError(true);
    }
  };

  const showImage = Boolean(currentSource && !hasError);

  const handleThumbPress = () => {
    if (showImage && currentSource) {
      onOpenImage(currentSource);
    } else {
      toast.warning("Original receipt image is not available for this bill.");
    }
  };

  const hasActiveRoom = Boolean(receipt.roomCode);

  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
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
                source={{ uri: currentSource }}
                style={styles.thumbImage}
                resizeMode="cover"
                onError={handleImageError}
              />
              <View style={styles.thumbBadge}>
                <Ionicons name="expand-outline" size={12} color="#FFFFFF" />
              </View>
            </>
          ) : (
            <View style={styles.thumbFallback}>
              <Ionicons name="receipt-outline" size={26} color={colors.gold} />
            </View>
          )}
        </Pressable>

        <View style={styles.cardInfo}>
          <View style={styles.storeRow}>
            <Text style={styles.storeName} numberOfLines={1}>
              {receipt.restaurantName || "Untitled Bill"}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.date}>{formatSavedAt(receipt.savedAt)}</Text>
          </View>

          {hasActiveRoom ? (
            <View style={styles.liveRoomBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveRoomText}>Room #{receipt.roomCode}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amount}>{formatMoney(receipt.total)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Pressable
          onPress={onSplit}
          disabled={splitting}
          style={({ pressed }) => [
            styles.splitBtn,
            hasActiveRoom ? styles.splitBtnActive : styles.splitBtnNew,
            (pressed || splitting) && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={hasActiveRoom ? "Enter Split Room" : "Split Bill"}
        >
          <Ionicons
            name={hasActiveRoom ? "enter-outline" : "people"}
            size={15}
            color={hasActiveRoom ? colors.onGold : "#FFFFFF"}
          />
          <Text
            style={[
              styles.splitBtnText,
              hasActiveRoom ? styles.splitBtnTextActive : styles.splitBtnTextNew,
            ]}
          >
            {splitting
              ? "Connecting..."
              : hasActiveRoom
                ? "Enter Room"
                : "Split Bill"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editBtn,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit Bill"
        >
          <Ionicons name="pencil-sharp" size={14} color={colors.textSecondary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>

        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={({ pressed }) => [
            styles.removeBtn,
            pressed && styles.removeBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete bill"
        >
          <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.12)",
    padding: spacing.lg,
    gap: spacing.md,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
        } as const)
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    position: "relative",
  },
  thumbWithImage: {
    borderColor: colors.goldBorder,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(217, 119, 6, 0.08)",
  },
  thumbPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbBadge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: radius.pill,
    padding: 3,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  storeName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  liveRoomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  liveRoomText: {
    color: colors.gold,
    fontSize: fontSize.xs - 1,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  amountBlock: {
    alignItems: "flex-end",
    gap: 1,
  },
  amountLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  amount: {
    color: colors.success,
    fontSize: fontSize.lg + 1,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  splitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.pill,
  },
  splitBtnActive: {
    backgroundColor: colors.gold,
    ...goldGlowShadow(),
  },
  splitBtnNew: {
    backgroundColor: colors.success,
  },
  splitBtnText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  splitBtnTextActive: {
    color: colors.onGold,
  },
  splitBtnTextNew: {
    color: "#FFFFFF",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.pill,
  },
  editBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  removeBtn: {
    marginLeft: "auto",
    padding: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  removeBtnPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
});
