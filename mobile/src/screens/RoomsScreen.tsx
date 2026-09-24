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
  ConfirmModal,
  EmptyState,
  MobileHeader,
  RoomCard,
  ScreenContainer,
} from "../components";
import { useToast } from "../contexts/ToastContext";
import {
  useRecentRoomsQuery,
  useRemoveRoomMutation,
} from "../hooks/useRoomsQuery";
import type { RoomEntry } from "../lib/history";
import { colors, spacing } from "../theme";
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

  const {
    data: rooms = [],
    isLoading,
    isRefetching,
    refetch,
  } = useRecentRoomsQuery();

  const removeMutation = useRemoveRoomMutation();

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
});
