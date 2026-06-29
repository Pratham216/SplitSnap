import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRoom, leaveRoom, setItemSelection } from "../api/rooms";
import { getGuestId, isUserSession } from "../lib/auth";
import { useSocket } from "../hooks/useSocket";
import QRDisplay from "../components/QRDisplay";
import HostUpiCard from "../components/HostUpiCard";
import PaymentPanel from "../components/PaymentPanel";
import ItemSelectionList, {
  applySelectionChange,
} from "../components/ItemSelectionList";
import { getParticipantShare } from "../lib/payments";
import type { Participant, Room } from "../api/rooms";

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const roomCode = code?.toUpperCase() ?? "";
  const myGuestId = getGuestId();

  const { data: room, isLoading, error } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => getRoom(roomCode),
    enabled: !!roomCode,
    refetchInterval: 30000,
  });

  useSocket(roomCode, {
    onParticipantJoined: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    },
    onParticipantLeft: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    },
    onItemSelectionChanged: (data) => {
      if (data.guestId === myGuestId) return;

      queryClient.setQueryData<Room>(["room", roomCode], (old) => {
        if (!old) return old;
        return applySelectionChange(
          old,
          data.itemId,
          data.guestId,
          data.quantity
        );
      });
    },
    onPaymentMarked: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    },
    onUpiUpdated: (data) => {
      queryClient.setQueryData<Room>(["room", roomCode], (old) =>
        old ? { ...old, hostUpiId: data.hostUpiId } : old
      );
    },
  });

  async function copyLink() {
    if (!room?.joinUrl) return;
    await navigator.clipboard.writeText(room.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    if (!roomCode) return;
    await leaveRoom(roomCode);
    queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    navigate(isUserSession() ? "/app" : "/", { replace: true });
  }

  async function handleSetQuantity(itemId: string, quantity: number) {
    if (!roomCode || !myGuestId) return;

    setSelectionError(null);

    const previous = queryClient.getQueryData<Room>(["room", roomCode]);
    queryClient.setQueryData<Room>(["room", roomCode], (old) => {
      if (!old) return old;
      return applySelectionChange(old, itemId, myGuestId, quantity);
    });
    setUpdatingItemId(itemId);

    try {
      const updated = await setItemSelection(roomCode, itemId, quantity);
      queryClient.setQueryData(["room", roomCode], updated);
    } catch (err) {
      if (previous) {
        queryClient.setQueryData(["room", roomCode], previous);
      }
      setSelectionError(
        err instanceof Error ? err.message : "Failed to update selection"
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-red-300">Room not found or expired.</p>
        <Link to="/" className="text-amber-400 hover:text-amber-300 transition-colors">
          Scan a new bill
        </Link>
      </div>
    );
  }

  const bill = room.bill;
  const isHost = myGuestId === room.hostGuestId;

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {bill?.restaurantName || "Split room"}
          </h2>
          <p className="text-neutral-400 text-sm mt-2">
            Code: <span className="font-mono text-amber-400 font-medium">{room.code}</span>
            {isHost && (
              <span className="ml-2 text-xs bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                Host
              </span>
            )}
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full border ${
            room.status === "open"
              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
              : "bg-neutral-800 text-neutral-400 border-neutral-700"
          }`}
        >
          {room.status}
        </span>
      </div>

      {isHost && (
        <HostUpiCard
          roomCode={roomCode}
          hostUpiId={room.hostUpiId ?? ""}
          variant={room.hostUpiId ? "inline" : "banner"}
          onUpdated={(hostUpiId) => {
            queryClient.setQueryData<Room>(["room", roomCode], (old) =>
              old ? { ...old, hostUpiId } : old
            );
          }}
        />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-5 space-y-3">
          <h3 className="font-semibold text-sm text-neutral-200">Invite friends</h3>
          <div className="flex justify-center">
            <QRDisplay url={room.joinUrl} />
          </div>
          <p className="text-xs text-neutral-500 text-center break-all font-mono">
            {room.joinUrl}
          </p>
          <button
            onClick={copyLink}
            className="w-full py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/60 hover:border-amber-500/40 hover:bg-neutral-900 text-sm transition-colors"
          >
            {copied ? "Link copied!" : "Copy invite link"}
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-5">
          <h3 className="font-semibold text-sm text-neutral-200 mb-3">
            Participants ({room.participants.length})
          </h3>
          <ul className="space-y-2">
            {room.participants.map((p: Participant) => {
              const isRoomHost = p.guestId === room.hostGuestId;
              const share = getParticipantShare(room, p.guestId);
              return (
              <li
                key={p.id}
                className="flex items-center gap-2 text-sm bg-neutral-900/50 rounded-xl px-3 py-2.5"
              >
                <span className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center font-medium">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {!isRoomHost && share && share.total > 0 && (
                    <span className="text-xs text-neutral-500">
                      ₹{share.total.toFixed(0)}
                    </span>
                  )}
                  {!isRoomHost && p.paid && (
                    <span className="badge-success px-1.5 py-0.5">
                      Paid
                    </span>
                  )}
                  {isRoomHost && (
                    <span className="text-xs text-neutral-500">host</span>
                  )}
                </div>
              </li>
            );
            })}
          </ul>
        </div>
      </div>

      {bill && (
        <ItemSelectionList
          bill={bill}
          selections={room.selections ?? {}}
          participants={room.participants}
          myGuestId={myGuestId}
          onSetQuantity={handleSetQuantity}
          updatingItemId={updatingItemId}
        />
      )}

      {selectionError && (
        <p className="text-sm text-red-300 text-center">{selectionError}</p>
      )}

      <PaymentPanel
        room={room}
        myGuestId={myGuestId}
        isHost={isHost}
        onRoomUpdated={(updated) =>
          queryClient.setQueryData(["room", roomCode], updated)
        }
      />

      <div className="flex gap-3">
        <button
          onClick={handleLeave}
          className="px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-900 transition-colors"
        >
          Leave room
        </button>
        {bill && (
          <Link
            to={`/bill/${bill.id}`}
            className="px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/60 text-sm hover:border-amber-500/40 transition-colors"
          >
            Edit bill
          </Link>
        )}
      </div>
    </div>
  );
}
