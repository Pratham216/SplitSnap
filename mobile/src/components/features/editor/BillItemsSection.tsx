import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BillItem } from "../../../api/bills";
import { colors, fontSize, radius, spacing } from "../../../theme";
import EditableItemRow from "./EditableItemRow";

export interface BillItemsSectionProps {
  items: BillItem[];
  onAddItem: () => void;
  onItemChange: (itemId: string, data: Partial<BillItem>) => void;
  onDeleteItem: (itemId: string) => void;
  focusItemId: string | null;
  onNameFocused: () => void;
}

export default function BillItemsSection({
  items,
  onAddItem,
  onItemChange,
  onDeleteItem,
  focusItemId,
  onNameFocused,
}: BillItemsSectionProps) {
  return (
    <View style={styles.billCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Items</Text>
        <Pressable onPress={onAddItem} hitSlop={8}>
          <Text style={styles.addLink}>
            <Text style={styles.addPlus}>+</Text> Add item
          </Text>
        </Pressable>
      </View>

      {items.length > 0 ? (
        <View style={styles.gridRowHeader}>
          <View style={styles.colItem}>
            <Text style={styles.itemColumnHeaderText}>Item</Text>
          </View>
          <View style={styles.colQty}>
            <Text style={styles.itemColumnHeaderText}>Qty</Text>
          </View>
          <View style={styles.colAmount}>
            <Text style={styles.itemColumnHeaderText}>Amount</Text>
          </View>
          <View style={styles.colAction} />
        </View>
      ) : null}

      {items.length === 0 ? (
        <Text style={styles.emptyText}>
          No items extracted. Add items manually.
        </Text>
      ) : (
        <View style={styles.itemList}>
          {items.map((item) => (
            <EditableItemRow
              key={item.id}
              item={item}
              onChange={onItemChange}
              onDelete={onDeleteItem}
              autoFocusName={focusItemId === item.id}
              onNameFocused={onNameFocused}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  billCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  addLink: {
    color: colors.goldLight,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  addPlus: {
    fontSize: fontSize.md,
  },
  gridRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  itemColumnHeaderText: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "500",
  },
  itemList: {
    borderTopWidth: 0,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
