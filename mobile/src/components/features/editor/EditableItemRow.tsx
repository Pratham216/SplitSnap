import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { BillItem } from "../../../api/bills";
import { colors, fontSize, radius, spacing } from "../../../theme";

export interface EditableItemRowProps {
  item: BillItem;
  onChange: (itemId: string, data: Partial<BillItem>) => void;
  onDelete: (itemId: string) => void;
  autoFocusName?: boolean;
  onNameFocused?: () => void;
}

export default function EditableItemRow({
  item,
  onChange,
  onDelete,
  autoFocusName = false,
  onNameFocused,
}: EditableItemRowProps) {
  const nameInputRef = useRef<TextInput>(null);
  const [qtyText, setQtyText] = useState(
    item.quantity > 0 ? String(item.quantity) : ""
  );
  const [priceText, setPriceText] = useState(
    item.price > 0 ? String(item.price) : ""
  );
  const priceFocusedRef = useRef(false);

  useEffect(() => {
    if (!autoFocusName) return;
    nameInputRef.current?.focus();
    onNameFocused?.();
  }, [autoFocusName, onNameFocused]);

  useEffect(() => {
    setQtyText(item.quantity > 0 ? String(item.quantity) : "");
  }, [item.quantity]);

  useEffect(() => {
    if (!priceFocusedRef.current) {
      setPriceText(item.price > 0 ? String(item.price) : "");
    }
  }, [item.price]);

  function applyQuantity(quantity: number) {
    setQtyText(String(quantity));
    onChange(item.id, { quantity });
  }

  function commitQty(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setQtyText("");
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQtyText(item.quantity > 0 ? String(item.quantity) : "");
      return;
    }
    applyQuantity(parsed);
  }

  function commitPrice(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setPriceText("");
      onChange(item.id, { price: 0 });
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPriceText(item.price > 0 ? String(item.price) : "");
      return;
    }
    setPriceText(String(parsed));
    onChange(item.id, { price: parsed });
  }

  return (
    <View style={styles.gridRow}>
      <View style={styles.colItem}>
        <TextInput
          ref={nameInputRef}
          style={styles.billInput}
          value={item.name}
          onChangeText={(v) => onChange(item.id, { name: v })}
          placeholder="Item name"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.colQty}>
        <TextInput
          style={[styles.billInput, styles.qtyInput]}
          value={qtyText}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={colors.textMuted}
          onChangeText={(v) => {
            if (v !== "" && !/^\d+$/.test(v)) return;
            setQtyText(v);
            if (v === "") return;
            const parsed = parseInt(v, 10);
            if (Number.isFinite(parsed) && parsed > 0) {
              applyQuantity(parsed);
            }
          }}
          onBlur={() => commitQty(qtyText)}
        />
      </View>
      <View style={styles.colAmount}>
        <View style={styles.priceRow}>
          <Text style={styles.pricePrefix}>₹</Text>
          <TextInput
            style={styles.itemPriceInput}
            value={priceText}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            onFocus={() => {
              priceFocusedRef.current = true;
            }}
            onChangeText={(v) => {
              if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
              setPriceText(v);
              if (v === "" || v === ".") {
                onChange(item.id, { price: 0 });
                return;
              }
              const parsed = parseFloat(v);
              if (Number.isFinite(parsed) && parsed > 0) {
                onChange(item.id, { price: parsed });
              }
            }}
            onBlur={() => {
              priceFocusedRef.current = false;
              commitPrice(priceText);
            }}
          />
        </View>
      </View>
      <View style={styles.colAction}>
        <Pressable onPress={() => onDelete(item.id)} hitSlop={8}>
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colItem: {
    flex: 6,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  colQty: {
    flex: 2,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  colAmount: {
    flex: 3,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  colAction: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
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
  qtyInput: {
    textAlign: "center",
  },
  itemPriceInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
    minHeight: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    minHeight: 40,
    width: "100%",
  },
  pricePrefix: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  deleteText: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 24,
    textAlign: "center",
  },
});
