import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getRoom, leaveRoom, setItemSelection } from "../api/rooms";
import { getGuestId } from "../lib/auth";
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
  }

  async function handleSetQuantity(itemId: string, quantity: number) {
    if (!roomCode || !myGuestId) return;

    setSelectionError(null);
    setUpdatingItemId(itemId);

    const previous = queryClient.getQueryData<Room>(["room", roomCode]);
    queryClient.setQueryData<Room>(["room", roomCode], (old) => {
      if (!old) return old;
      return applySelectionChange(old, itemId, myGuestId, quantity);
    });

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
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-red-300">Room not found or expired.</p>
        <Link to="/" className="text-emerald-400 hover:underline">
          Scan a new bill
        </Link>
      </div>
    );
  }

  const bill = room.bill;
  const isHost = myGuestId === room.hostGuestId;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {bill?.restaurantName || "Split room"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Code: <span className="font-mono text-emerald-400">{room.code}</span>
            {isHost && (
              <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                Host
              </span>
            )}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            room.status === "open"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-700 text-slate-400"
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
        <div className="rounded-xl border border-slate-800 p-4 space-y-3">
          <h3 className="font-medium text-sm text-slate-300">Invite friends</h3>
          <div className="flex justify-center">
            <QRDisplay url={room.joinUrl} />
          </div>
          <p className="text-xs text-slate-500 text-center break-all font-mono">
            {room.joinUrl}
          </p>
          <button
            onClick={copyLink}
            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
          >
            {copied ? "Link copied!" : "Copy invite link"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 p-4">
          <h3 className="font-medium text-sm text-slate-300 mb-3">
            Participants ({room.participants.length})
          </h3>
          <ul className="space-y-2">
            {room.participants.map((p: Participant) => {
              const isRoomHost = p.guestId === room.hostGuestId;
              const share = getParticipantShare(room, p.guestId);
              return (
              <li
                key={p.id}
                className="flex items-center gap-2 text-sm bg-slate-900/50 rounded-lg px-3 py-2"
              >
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-medium">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {!isRoomHost && share && share.total > 0 && (
                    <span className="text-xs text-slate-500">
                      ₹{share.total.toFixed(0)}
                    </span>
                  )}
                  {!isRoomHost && p.paid && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      Paid
                    </span>
                  )}
                  {isRoomHost && (
                    <span className="text-xs text-slate-500">host</span>
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
          className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:bg-slate-800"
        >
          Leave room
        </button>
        {bill && (
          <Link
            to={`/bill/${bill.id}`}
            className="px-4 py-2 rounded-lg bg-slate-800 text-sm hover:bg-slate-700"
          >
            Edit bill
          </Link>
        )}
      </div>
    </div>
  );
}
