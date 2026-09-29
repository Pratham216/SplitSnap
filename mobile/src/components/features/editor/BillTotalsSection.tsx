import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TaxBreakdown } from "@zaptab/shared";
import { colors, fontSize, radius, spacing } from "../../../theme";

interface BillTotalsSectionProps {
  taxes: TaxBreakdown[];
  serviceCharge: number;
  subtotal: number;
  grandTotal: number;
  isManuallyModified?: boolean;
  onTaxesChange: (taxes: TaxBreakdown[]) => void;
  onFieldChange: (
    fields: Partial<{
      serviceCharge: number;
      subtotal: number;
      grandTotal: number;
    }>
  ) => void;
}

export default function BillTotalsSection({
  taxes = [],
  serviceCharge,
  subtotal,
  grandTotal,
  isManuallyModified = false,
  onTaxesChange,
  onFieldChange,
}: BillTotalsSectionProps) {
  const totalTax = taxes.reduce((sum, t) => sum + (t.amount || 0), 0);

  function handleTaxAmountChange(index: number, newAmount: number) {
    const next = [...taxes];
    next[index] = { ...next[index], amount: newAmount };
    onTaxesChange(next);
  }

  function handleTaxNameChange(index: number, newName: string) {
    const next = [...taxes];
    next[index] = { ...next[index], name: newName };
    onTaxesChange(next);
  }

  function handleRemoveTax(index: number) {
    const next = taxes.filter((_, i) => i !== index);
    onTaxesChange(next);
  }

  function handleAddTax() {
    const next = [...taxes, { name: `Tax ${taxes.length + 1}`, amount: 0 }];
    onTaxesChange(next);
  }

  return (
    <View style={styles.container}>
      {isManuallyModified && (
        <View style={styles.modifiedBadge}>
          <Text style={styles.modifiedBadgeText}>Manually Modified</Text>
        </View>
      )}

      {/* Single Unified Taxes & Totals Card */}
      <View style={styles.unifiedCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>TAXES & CHARGES</Text>
          <Text style={styles.totalTaxHeader}>Total Tax: ₹{totalTax.toFixed(2)}</Text>
        </View>

        {taxes.length === 0 ? (
          <Text style={styles.noTaxesText}>No individual taxes extracted</Text>
        ) : (
          taxes.map((t, idx) => (
            <View key={idx} style={styles.taxRow}>
              <TextInput
                style={styles.taxNameInput}
                value={t.name + (t.rate ? ` @ ${t.rate}%` : "")}
                onChangeText={(val) => handleTaxNameChange(idx, val)}
                placeholder="Tax name"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.taxAmountInputRow}>
                <Text style={styles.pricePrefix}>₹</Text>
                <TextInput
                  style={styles.taxAmountInput}
                  value={String(t.amount)}
                  keyboardType="decimal-pad"
                  onChangeText={(val) => {
                    const parsed = parseFloat(val);
                    handleTaxAmountChange(idx, Number.isFinite(parsed) ? parsed : 0);
                  }}
                />
                <Pressable onPress={() => handleRemoveTax(idx)} hitSlop={8}>
                  <Text style={styles.removeTaxText}>×</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable style={styles.addTaxBtn} onPress={handleAddTax}>
          <Text style={styles.addTaxBtnText}>+ Add Tax / Charge</Text>
        </Pressable>

        <View style={styles.cardDivider} />

        <View style={styles.totalsGrid}>
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
      </View>
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
  container: {
    marginBottom: spacing.xl,
  },
  modifiedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    borderColor: "rgba(234, 179, 8, 0.3)",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  modifiedBadgeText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  unifiedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionHeaderTitle: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
  },
  totalTaxHeader: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  noTaxesText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  taxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  taxNameInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xs,
  },
  taxAmountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
  },
  taxAmountInput: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    minWidth: 50,
    paddingVertical: spacing.xs,
  },
  removeTaxText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  addTaxBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  addTaxBtnText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
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
