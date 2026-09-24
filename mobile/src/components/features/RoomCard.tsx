import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateTime } from "../../lib/formatters";
import type { RoomEntry } from "../../lib/history";
import { colors, fontSize, radius, spacing } from "../../theme";

export interface RoomCardProps {
  /** The room entry from user history */
  room: RoomEntry;
  /** Callback triggered when the card or Enter Room button is tapped */
  onOpen: () => void;
  /** Callback triggered when the trash/remove button is tapped */
  onRemove: () => void;
}

/**
 * RoomCard displays an individual bill-split room item with restaurant name,
 * formatted date/time, and separate tap actions for opening and removal.
 */
export default function RoomCard({ room, onOpen, onRemove }: RoomCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Pressable
          style={({ pressed }) => [
            styles.cardMainClickable,
            pressed && styles.cardMainPressed,
          ]}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Open room for ${room.restaurantName || "bill"}`}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="restaurant-outline" size={20} color={colors.gold} />
          </View>

          <View style={styles.titleInfo}>
            <Text style={styles.restaurant} numberOfLines={1}>
              {room.restaurantName || "Bill Split"}
            </Text>
            <Text style={styles.dateTimeText}>
              {formatDateTime(room.savedAt)}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onRemove();
          }}
          hitSlop={12}
          style={({ pressed }) => [
            styles.removeBtn,
            pressed && styles.removeBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Remove room"
        >
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.cardFooter,
          pressed && styles.footerPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Enter Room"
      >
        <View style={styles.enterSplitBtn}>
          <Text style={styles.enterSplitText}>Enter Room</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.gold} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.gold,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMainClickable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginRight: spacing.sm,
  },
  cardMainPressed: {
    opacity: 0.85,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleInfo: {
    flex: 1,
    gap: 3,
  },
  restaurant: {
    color: colors.textPrimary,
    fontSize: fontSize.md + 1,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  dateTimeText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 0.2,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  removeBtnPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  footerPressed: {
    opacity: 0.75,
  },
  enterSplitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  enterSplitText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
