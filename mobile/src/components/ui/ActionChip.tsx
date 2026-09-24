import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontSize, radius, spacing } from "../../theme";

export interface ActionChipProps {
  /** The text label displayed inside the chip */
  label: string;
  /** Ionicons icon name */
  icon: keyof typeof Ionicons.glyphMap;
  /** Background color for the chip */
  color: string;
  /** Handler invoked when chip is pressed */
  onPress: () => void;
  /** Whether the chip interaction is disabled */
  disabled?: boolean;
}

/**
 * ActionChip renders a rounded, colorful pill button with an icon and label.
 * Used for primary card quick actions like "split it", "edit", etc.
 */
export default function ActionChip({
  label,
  icon,
  color,
  onPress,
  disabled = false,
}: ActionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: color },
        (pressed || disabled) && styles.chipPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  chipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  chipLabel: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "600",
    textTransform: "lowercase",
  },
});
