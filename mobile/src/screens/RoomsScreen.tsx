import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  ConfirmModal,
  EmptyState,
  MobileHeader,
  RoomCard,
  ScreenContainer,
} from "../components";
import { useToast } from "../contexts/ToastContext";
import {
  useClearAllRoomsMutation,
  useRecentRoomsQuery,
  useRemoveRoomMutation,
} from "../hooks/useRoomsQuery";
import type { RoomEntry } from "../lib/history";
import { colors, fontSize, radius, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

/**
 * RoomsScreen renders the user's active and recent bill split rooms.
 * Powered by TanStack Query for automatic background caching and instant sync.
 */
export default function RoomsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const [roomToDelete, setRoomToDelete] = useState<RoomEntry | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const {
    data: rooms = [],
    isLoading,
    isRefetching,
    refetch,
  } = useRecentRoomsQuery();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const removeMutation = useRemoveRoomMutation();
  const clearAllMutation = useClearAllRoomsMutation();

  const handleConfirmRemove = async () => {
    if (!roomToDelete) return;
    const target = roomToDelete;
    setRoomToDelete(null);

    try {
      await removeMutation.mutateAsync(target.code);
      toast.info(
        `Removed ${target.restaurantName || target.code} from history`
      );
    } catch {
      toast.error("Could not remove room");
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      await clearAllMutation.mutateAsync();
      setConfirmClearAll(false);
      toast.success("All rooms cleared from this device");
    } catch {
      toast.error("Could not clear rooms");
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container} edges={["top"]}>
      <MobileHeader
        title="Your Rooms"
        goldTitle
        subtitle="Active & recent bill splits"
        actionIcon="enter-outline"
        actionLabel="Join with room code"
        actionTone="emerald"
        onAction={() => (navigation as any).navigate("Join")}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No Split Rooms Yet"
          description="Host a bill or join friends with a code. All your shared rooms will stay here for easy access."
          actionLabel="Join with code"
          onAction={() => (navigation as any).navigate("Join")}
          secondaryActionLabel="Host from bill"
          onSecondaryAction={() => (navigation as any).navigate("Bills")}
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
          <View style={styles.topActionsRow}>
            <Text style={styles.roomCountText}>
              {rooms.length} {rooms.length === 1 ? "room" : "rooms"} in history
            </Text>
            <Pressable
              onPress={() => setConfirmClearAll(true)}
              style={({ pressed }) => [
                styles.clearAllBtn,
                pressed && styles.clearAllBtnPressed,
              ]}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          </View>

          {rooms.map((room) => (
            <RoomCard
              key={room.code}
              room={room}
              onOpen={() => navigation.navigate("Room", { code: room.code })}
              onRemove={() => setRoomToDelete(room)}
            />
          ))}
        </ScrollView>
      )}

      <ConfirmModal
        visible={Boolean(roomToDelete)}
        title="Remove Room?"
        message={`Remove ${
          roomToDelete?.restaurantName
            ? `"${roomToDelete.restaurantName}"`
            : "this room"
        } from your history? You can still rejoin anytime with the code.`}
        confirmLabel="Remove"
        variant="danger"
        loading={removeMutation.isPending}
        onCancel={() => setRoomToDelete(null)}
        onConfirm={handleConfirmRemove}
      />

      <ConfirmModal
        visible={confirmClearAll}
        title="Clear All Rooms?"
        message="This will remove all room history from this device. You can always rejoin any room with its 6-character code."
        confirmLabel="Clear All"
        variant="danger"
        loading={clearAllMutation.isPending}
        onCancel={() => setConfirmClearAll(false)}
        onConfirm={handleConfirmClearAll}
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
    paddingBottom: spacing.xxl,
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: spacing.xs,
  },
  roomCountText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  clearAllBtnPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    opacity: 0.8,
  },
  clearAllText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
