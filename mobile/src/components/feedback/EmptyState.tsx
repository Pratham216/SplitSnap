import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "../ui/Button";
import { colors, fontSize, radius, spacing } from "../../theme";

export interface EmptyStateProps {
  /** Main icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Primary headline for the empty state */
  title: string;
  /** Explanatory description */
  description?: string;
  /** Custom illustration node (overrides icon) */
  illustration?: React.ReactNode;
  /** Primary button label */
  actionLabel?: string;
  /** Primary button press handler */
  onAction?: () => void;
  /** Primary button shimmer effect */
  actionShimmer?: boolean;
  /** Secondary button label */
  secondaryActionLabel?: string;
  /** Secondary button press handler */
  onSecondaryAction?: () => void;
}

/**
 * Reusable EmptyState component for screens and lists when no data is available.
 * Designed with ZapTab gold halo illustration and clean call-to-actions.
 */
export default function EmptyState({
  icon = "grid-outline",
  title,
  description,
  illustration,
  actionLabel,
  onAction,
  actionShimmer = false,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration ?? (
        <View style={styles.iconRing}>
          <View style={styles.iconInner}>
            <Ionicons name={icon} size={36} color={colors.gold} />
          </View>
        </View>
      )}

      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}

      {actionLabel || secondaryActionLabel ? (
        <View style={styles.actions}>
          {actionLabel && onAction ? (
            <Button
              label={actionLabel}
              variant="primary"
              shimmer={actionShimmer}
              fullWidth
              onPress={onAction}
            />
          ) : null}

          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              label={secondaryActionLabel}
              variant="secondary"
              fullWidth
              onPress={onSecondaryAction}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 300,
  },
  actions: {
    width: "100%",
    maxWidth: 280,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
