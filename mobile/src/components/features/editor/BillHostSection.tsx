import type { RefObject } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Button from "../../ui/Button";
import GradientGoldText from "../../ui/GradientGoldText";
import { formatMoney } from "../../../lib/formatters";
import { colors, fontSize, radius, spacing } from "../../../theme";
import BillField from "./BillField";

interface BillHostSectionProps {
  itemsTotal: number;
  hostName: string;
  onHostNameChange: (name: string) => void;
  hostUpiId: string;
  onHostUpiIdChange: (upiId: string) => void;
  hostNameInputRef?: RefObject<TextInput | null>;
  creatingRoom: boolean;
  onCreateRoom: () => void;
  roomError: string | null;
  saveError: string | null;
}

export default function BillHostSection({
  itemsTotal,
  hostName,
  onHostNameChange,
  hostUpiId,
  onHostUpiIdChange,
  hostNameInputRef,
  creatingRoom,
  onCreateRoom,
  roomError,
  saveError,
}: BillHostSectionProps) {
  return (
    <View style={styles.premiumCard}>
      <Text style={styles.itemsTotalLabel}>Items total</Text>
      <GradientGoldText size="display">{formatMoney(itemsTotal)}</GradientGoldText>

      <View style={styles.shareFields}>
        <BillField
          label="Your name (host)"
          value={hostName}
          onChangeText={onHostNameChange}
          placeholder="e.g. Rahul"
          inputRef={hostNameInputRef}
        />
        <BillField
          label="Your UPI ID (optional)"
          value={hostUpiId}
          onChangeText={onHostUpiIdChange}
          placeholder="you@ybl"
        />
      </View>

      <Button
        label="Create room & share"
        fullWidth
        shimmer
        loading={creatingRoom}
        disabled={creatingRoom}
        onPress={onCreateRoom}
      />
      {roomError ? <Text style={styles.errorText}>{roomError}</Text> : null}
      {saveError ? <Text style={styles.saveWarn}>{saveError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  premiumCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldMuted,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  itemsTotalLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  shareFields: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  saveWarn: {
    color: colors.gold,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
});
