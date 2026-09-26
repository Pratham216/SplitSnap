import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BillImageModal,
  ConfirmModal,
  EmptyState,
  MobileHeader,
  ReceiptCard,
  ScreenContainer,
} from "../components";
import { useOpenScan } from "../contexts/ScanContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  useCreateSplitRoomMutation,
  useRecentReceiptsQuery,
  useRemoveReceiptMutation,
} from "../hooks/useBillsQuery";
import { formatMoney } from "../lib/formatters";
import type { ReceiptEntry } from "../lib/history";
import { colors, fontSize, radius, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

/**
 * BillsScreen displays the user's saved receipt history,
 * allowing instant bill splitting, review/editing, and image preview.
 * Powered by TanStack Query for automatic background synchronization.
 */
export default function BillsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const openScan = useOpenScan();
  const toast = useToast();

  const [billToDelete, setBillToDelete] = useState<ReceiptEntry | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<{
    receipt: ReceiptEntry;
    imageUri: string;
  } | null>(null);

  const {
    data: receipts = [],
    isLoading,
    isRefetching,
    refetch,
  } = useRecentReceiptsQuery();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const removeMutation = useRemoveReceiptMutation();
  const splitMutation = useCreateSplitRoomMutation();

  const totalSpent = useMemo(
    () => receipts.reduce((acc, r) => acc + (r.total || 0), 0),
    [receipts]
  );

  const activeSplitsCount = useMemo(
    () => receipts.filter((r) => Boolean(r.roomCode)).length,
    [receipts]
  );

  async function handleSplit(receipt: ReceiptEntry) {
    if (receipt.roomCode) {
      navigation.navigate("Room", { code: receipt.roomCode });
      return;
    }

    const hostName = user?.name?.trim();
    if (!hostName) {
      navigation.navigate("BillReview", {
        billId: receipt.billId,
        focusSplit: true,
      });
      return;
    }

    try {
      const room = await splitMutation.mutateAsync({
        billId: receipt.billId,
        hostName,
        hostUpiId: user?.upiId,
        fallbackRestaurantName: receipt.restaurantName,
      });
      toast.success(`Split room created! Code: ${room.code}`);
      navigation.navigate("Room", { code: room.code });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create a split room";
      toast.error(`Split failed: ${message}`);
    }
  }

  const handleConfirmRemoveBill = async () => {
    if (!billToDelete) return;
    const target = billToDelete;
    setBillToDelete(null);

    try {
      await removeMutation.mutateAsync(target.billId);
      toast.info(`Removed ${target.restaurantName || "receipt"} from history`);
    } catch {
      toast.error("Could not remove receipt");
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container} edges={["top"]}>
      <MobileHeader
        title="Your Bills"
        goldTitle
        subtitle="Capture and split receipts instantly"
        onAction={openScan}
        actionIcon="camera"
        actionLabel="Scan receipt"
        actionTone="emerald"
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : receipts.length === 0 ? (
        <EmptyState
          icon="camera"
          title="No Bills Yet"
          description="Scan a receipt to turn it into a bill you can split with friends."
          actionLabel="Scan receipt"
          actionShimmer
          onAction={openScan}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.gold}
            />
          }
          contentContainerStyle={styles.list}
        >
          <View style={styles.statsBanner}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Tracked</Text>
              <Text style={styles.statValue}>{formatMoney(totalSpent)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Receipts</Text>
              <Text style={styles.statValueSecondary}>{receipts.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Active Splits</Text>
              <View style={styles.splitStatRow}>
                {activeSplitsCount > 0 ? <View style={styles.activeDot} /> : null}
                <Text style={styles.statValueGold}>{activeSplitsCount}</Text>
              </View>
            </View>
          </View>

          {receipts.map((receipt) => (
            <ReceiptCard
              key={receipt.billId}
              receipt={receipt}
              splitting={
                splitMutation.isPending &&
                splitMutation.variables?.billId === receipt.billId
              }
              onSplit={() => void handleSplit(receipt)}
              onEdit={() =>
                navigation.navigate("BillReview", { billId: receipt.billId })
              }
              onOpenImage={(imageUri) =>
                setPreviewReceipt({ receipt, imageUri })
              }
              onRemove={() => setBillToDelete(receipt)}
            />
          ))}
        </ScrollView>
      )}

      {previewReceipt ? (
        <BillImageModal
          visible={Boolean(previewReceipt)}
          receipt={previewReceipt.receipt}
          imageUri={previewReceipt.imageUri}
          onClose={() => setPreviewReceipt(null)}
          onDownloadToast={(msg, isErr) =>
            isErr ? toast.error(msg) : toast.success(msg)
          }
        />
      ) : null}

      <ConfirmModal
        visible={Boolean(billToDelete)}
        title="Remove Bill?"
        message={`Remove ${
          billToDelete?.restaurantName
            ? `"${billToDelete.restaurantName}"`
            : "this receipt"
        } from your history? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        loading={removeMutation.isPending}
        onCancel={() => setBillToDelete(null)}
        onConfirm={handleConfirmRemoveBill}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  statsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
        } as const)
      : {}),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderStrong,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  statValue: {
    color: colors.success,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  statValueSecondary: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  statValueGold: {
    color: colors.gold,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  splitStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
});
