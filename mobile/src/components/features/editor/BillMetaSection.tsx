import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "../../../theme";
import BillField from "./BillField";

interface BillMetaSectionProps {
  restaurantName: string;
  billDate: string;
  onRestaurantNameChange: (value: string) => void;
  onBillDateChange: (value: string) => void;
}

export default function BillMetaSection({
  restaurantName,
  billDate,
  onRestaurantNameChange,
  onBillDateChange,
}: BillMetaSectionProps) {
  return (
    <View style={styles.billCard}>
      <View style={styles.metaGrid}>
        <BillField
          label="Restaurant"
          value={restaurantName}
          onChangeText={onRestaurantNameChange}
        />
        <BillField
          label="Date"
          value={billDate}
          onChangeText={onBillDateChange}
        />
      </View>
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
  metaGrid: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
