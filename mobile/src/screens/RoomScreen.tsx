import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Button,
  Card,
  ConfirmModal,
  ItemSelectionList,
  PaymentPanel,
  QRDisplay,
  ScreenContainer,
  UserAvatar,
} from "../components";
import { useToast } from "../contexts/ToastContext";
import {
  getRoom,
  leaveRoom,
  setItemSelection,
  type Room,
} from "../api/rooms";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { applySelectionChange } from "../lib/selections";
import { getParticipantShare } from "../lib/payments";
import { saveRoom } from "../lib/history";
import { colors, fontSize, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Room">;

function formatExpiresIn(expiresAtIso?: string): string | null {
  if (!expiresAtIso) return null;
  const exp = new Date(expiresAtIso).getTime();
  if (Number.isNaN(exp)) return null;
  const diffMs = exp - Date.now();
  if (diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

export default function RoomScreen({ navigation, route }: Props) {
  const roomCode = route.params.code.toUpperCase();
  const { session } = useAuth();
  const toast = useToast();
  const myGuestId = session?.guestId ?? null;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadRoom = useCallback(async () => {
    try {
      const data = await getRoom(roomCode);
      setRoom(data);
      setError(null);
      if (data.bill) {
        const isHost = session?.guestId === data.hostGuestId;
        await saveRoom({
          code: data.code,
          role: isHost ? "host" : "guest",
          restaurantName: data.bill.restaurantName,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Room not found");
    } finally {
      setLoading(false);
    }
  }, [roomCode, session?.guestId]);

  useEffect(() => {
    loadRoom();
    const timer = setInterval(loadRoom, 30000);
    return () => clearInterval(timer);
  }, [loadRoom]);

  useSocket(roomCode, {
    onParticipantJoined: loadRoom,
    onParticipantLeft: loadRoom,
    onItemSelectionChanged: (data) => {
      if (data.guestId === myGuestId) return;
      setRoom((old) =>
        old ? applySelectionChange(old, data.itemId, data.guestId, data.quantity) : old
      );
    },
    onPaymentMarked: loadRoom,
    onUpiUpdated: (data) => {
      setRoom((old) => (old ? { ...old, hostUpiId: data.hostUpiId } : old));
    },
  });

  async function copyLink() {
    if (!room?.joinUrl) return;
    await Clipboard.setStringAsync(room.joinUrl);
    setCopied(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirmLeave() {
    setLeaving(true);
    try {
      await leaveRoom(roomCode);
    } catch (err) {
      console.warn("Error leaving room on server:", err);
    } finally {
      setLeaving(false);
      setLeaveModalVisible(false);
      toast.info("You left the split room");
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    }
  }

  async function handleSetQuantity(itemId: string, quantity: number) {
    if (!myGuestId) return;

    setSelectionError(null);
    setUpdatingItemId(itemId);

    try {
      const updated = await setItemSelection(roomCode, itemId, quantity);
      setRoom(updated);
    } catch (err) {
      setSelectionError(
        err instanceof Error ? err.message : "Failed to update selection"
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer center>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenContainer>
    );
  }

  if (error || !room) {
    return (
      <ScreenContainer center>
        <Text style={typography.heading}>Room not found</Text>
        <Text style={[typography.body, styles.errorText]}>{error}</Text>
        <Button label="Go home" onPress={() => navigation.navigate("Main")} />
      </ScreenContainer>
    );
  }

  const bill = room.bill;
  const isHost = myGuestId === room.hostGuestId;

  return (
    <ScreenContainer scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={typography.kicker}>Room</Text>
          <Text style={[typography.heading, styles.title]}>
            {bill?.restaurantName || "Split room"}
          </Text>
          <Text style={styles.code}>
            Code: <Text style={styles.codeValue}>{room.code}</Text>
            {formatExpiresIn(room.expiresAt) ? (
              <Text style={styles.expiresText}>
                {" · "}
                {formatExpiresIn(room.expiresAt)}
              </Text>
            ) : null}
          </Text>
          {isHost ? (
            <View style={styles.hostBadgeWrap}>
              <Text style={styles.hostBadge}>Host</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Card style={styles.inviteCard}>
        <Text style={styles.sectionTitle}>Invite friends</Text>
        <QRDisplay url={room.joinUrl} />
        <Text style={styles.joinUrl}>{room.joinUrl}</Text>
        <Button
          label={copied ? "Link copied!" : "Copy invite link"}
          variant="copyLink"
          fullWidth
          onPress={copyLink}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>
          Participants ({room.participants.length})
        </Text>
        <View style={styles.participantList}>
          {room.participants.map((p) => {
            const isRoomHost = p.guestId === room.hostGuestId;
            const share = getParticipantShare(room, p.guestId);
            return (
              <View key={p.id} style={styles.participantRow}>
                <UserAvatar name={p.name} size="xs" />
                <Text style={styles.participantName}>{p.name}</Text>
                <View style={styles.participantMeta}>
                  {!isRoomHost && share && share.total > 0 ? (
                    <Text
                      style={[
                        styles.participantShare,
                        p.paid
                          ? styles.participantSharePaid
                          : styles.participantShareUnpaid,
                      ]}
                    >
                      ₹{share.total.toFixed(0)}
                    </Text>
                  ) : null}
                  {isRoomHost ? (
                    <Text style={styles.hostTag}>host</Text>
                  ) : p.paid ? (
                    <Text style={styles.paidTag}>Paid</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      {bill ? (
        <ItemSelectionList
          bill={bill}
          selections={room.selections ?? {}}
          participants={room.participants}
          myGuestId={myGuestId}
          onSetQuantity={handleSetQuantity}
          updatingItemId={updatingItemId}
        />
      ) : null}

      {selectionError ? (
        <Text style={styles.selectionError}>{selectionError}</Text>
      ) : null}

      <PaymentPanel
        room={room}
        myGuestId={myGuestId}
        isHost={isHost}
        onRoomUpdated={setRoom}
      />

      <View style={styles.footerActions}>
        <Button
          label="Leave room"
          variant="danger"
          onPress={() => setLeaveModalVisible(true)}
          style={styles.footerButton}
        />
        {bill ? (
          <Button
            label="Edit bill"
            variant="goldOutline"
            onPress={() => navigation.navigate("BillReview", { billId: bill.id })}
            style={styles.footerButton}
          />
        ) : null}
      </View>

      <ConfirmModal
        visible={leaveModalVisible}
        title="Leave Split Room?"
        message="You'll exit this bill split session. You can always rejoin anytime with the room code."
        confirmLabel="Leave Room"
        cancelLabel="Stay"
        variant="danger"
        loading={leaving}
        onCancel={() => setLeaveModalVisible(false)}
        onConfirm={handleConfirmLeave}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    marginTop: spacing.xs,
  },
  code: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  codeValue: {
    color: colors.gold,
    fontFamily: "monospace",
  },
  expiresText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  hostBadgeWrap: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  hostBadge: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    overflow: "hidden",
  },
  inviteCard: {
    alignItems: "center",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
    alignSelf: "flex-start",
  },
  joinUrl: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    paddingHorizontal: spacing.xs,
  },
  participantList: {
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  participantName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
  },
  participantMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  participantShare: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  participantShareUnpaid: {
    color: colors.danger,
  },
  participantSharePaid: {
    color: colors.success,
  },
  hostTag: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  paidTag: {
    color: colors.success,
    fontSize: fontSize.xs,
    backgroundColor: colors.successMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  selectionError: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginVertical: spacing.xs,
  },
  footerActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    marginVertical: spacing.md,
  },
});
