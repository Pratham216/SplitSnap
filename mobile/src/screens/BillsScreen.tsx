import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import type { ReceiptEntry } from "../lib/history";
import { colors, spacing } from "../theme";
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

  const removeMutation = useRemoveReceiptMutation();
  const splitMutation = useCreateSplitRoomMutation();

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
        subtitle="Capture Your Receipts"
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
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
