import type { RefObject } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fontSize, radius, spacing } from "../../../theme";

interface BillFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  inputRef?: RefObject<TextInput | null>;
}

export default function BillField({
  label,
  value,
  onChangeText,
  placeholder,
  inputRef,
}: BillFieldProps) {
  return (
    <View style={styles.billField}>
      <Text style={styles.billLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={styles.billInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.gold}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  billField: {
    gap: spacing.xs,
    flex: 1,
  },
  billLabel: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  billInput: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
});
