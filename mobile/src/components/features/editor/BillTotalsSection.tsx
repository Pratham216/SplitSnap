import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fontSize, radius, spacing } from "../../../theme";

interface BillTotalsSectionProps {
  tax: number;
  serviceCharge: number;
  subtotal: number;
  grandTotal: number;
  onFieldChange: (
    fields: Partial<{
      tax: number;
      serviceCharge: number;
      subtotal: number;
      grandTotal: number;
    }>
  ) => void;
}

export default function BillTotalsSection({
  tax,
  serviceCharge,
  subtotal,
  grandTotal,
  onFieldChange,
}: BillTotalsSectionProps) {
  return (
    <View style={styles.totalsCard}>
      <NumberField
        label="Tax (GST)"
        value={tax}
        onChange={(v) => onFieldChange({ tax: v })}
      />
      <NumberField
        label="Service charge"
        value={serviceCharge}
        onChange={(v) => onFieldChange({ serviceCharge: v })}
      />
      <NumberField
        label="Subtotal"
        value={subtotal}
        onChange={(v) => onFieldChange({ subtotal: v })}
      />
      <NumberField
        label="Grand total"
        value={grandTotal}
        onChange={(v) => onFieldChange({ grandTotal: v })}
        highlight
      />
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  highlight = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  highlight?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <View style={[styles.billField, styles.totalsField]}>
      <Text style={[styles.billLabel, highlight && styles.billLabelHighlight]}>
        {label}
      </Text>
      <View
        style={[
          styles.numberInputRow,
          highlight && styles.numberInputHighlight,
        ]}
      >
        <Text
          style={[styles.pricePrefix, highlight && styles.pricePrefixGold]}
        >
          ₹
        </Text>
        <TextInput
          style={[
            styles.numberInput,
            highlight && styles.numberInputTextHighlight,
          ]}
          value={text}
          keyboardType="decimal-pad"
          onChangeText={(v) => {
            setText(v);
            const parsed = parseFloat(v);
            if (Number.isFinite(parsed) && parsed >= 0) {
              onChange(parsed);
            }
          }}
          onBlur={() => {
            const parsed = parseFloat(text);
            const final = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            setText(String(final));
            onChange(final);
          }}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.gold}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  totalsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
  },
  billField: {
    gap: spacing.xs,
    flex: 1,
  },
  totalsField: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 140,
  },
  billLabel: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  billLabelHighlight: {
    color: colors.gold,
    fontWeight: "600",
  },
  numberInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: "transparent",
  },
  numberInputHighlight: {
    borderColor: colors.borderStrong,
  },
  numberInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  numberInputTextHighlight: {
    fontWeight: "600",
    color: colors.goldLight,
  },
  pricePrefix: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  pricePrefixGold: {
    color: colors.gold,
  },
});
