import { useState } from "react";
import QRDisplay from "./QRDisplay";
import { markSelfPaid } from "../api/rooms";
import type { Room } from "../api/rooms";
import {
  buildPaymentUpiUrl,
  getMyShare,
  getParticipantShare,
  isMobileDevice,
} from "../lib/payments";

interface PaymentPanelProps {
  room: Room;
  myGuestId: string | null;
  isHost: boolean;
  onRoomUpdated: (room: Room) => void;
}

export default function PaymentPanel({
  room,
  myGuestId,
  isHost,
  onRoomUpdated,
}: PaymentPanelProps) {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const myShare = getMyShare(room, myGuestId);
  const myParticipant = room.participants.find((p) => p.guestId === myGuestId);
  const isPaid = myParticipant?.paid ?? false;
  const amount = myShare?.total ?? 0;
  const hasHostUpi = !!room.hostUpiId;
  const upiUrl =
    hasHostUpi && amount > 0 ? buildPaymentUpiUrl(room, amount) : null;

  async function handleMarkPaid() {
    setError(null);
    setMarking(true);
    try {
      const updated = await markSelfPaid(room.code);
      onRoomUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setMarking(false);
    }
  }

  function handlePayWithUpi() {
    if (!upiUrl) return;
    if (isMobileDevice()) {
      window.location.href = upiUrl;
    } else {
      setShowQr(true);
    }
  }

  if (isHost) {
    const guests = room.participants.filter(
      (p) => p.guestId !== room.hostGuestId
    );
    if (guests.length === 0) return null;

    return (
      <div className="rounded-xl border border-slate-800 p-4 space-y-3">
        <h3 className="font-medium text-sm text-slate-300">Payment status</h3>
        {!hasHostUpi && (
          <p className="text-xs text-amber-400/90">
            Add your UPI ID above so friends can pay you.
          </p>
        )}
        <ul className="space-y-2">
          {guests.map((p) => {
            const share = getParticipantShare(room, p.guestId);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm bg-slate-900/50 rounded-lg px-3 py-2"
              >
                <span>{p.name}</span>
                <div className="flex items-center gap-2">
                  {share && share.total > 0 && (
                    <span className="text-slate-400">
                      ₹{share.total.toFixed(2)}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.paid
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {p.paid ? "Paid" : "Pending"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (!myShare || amount <= 0) {
    return (
      <div className="rounded-xl border border-slate-800 p-4 text-center">
        <p className="text-sm text-slate-400">
          Select what you had to see your share and pay.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-emerald-300/80">You owe</p>
          <p className="text-2xl font-bold text-emerald-300">
            ₹{amount.toFixed(2)}
          </p>
        </div>
        {isPaid && (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
            Marked paid
          </span>
        )}
      </div>

      {!hasHostUpi ? (
        <p className="text-sm text-amber-300/90">
          Host hasn&apos;t added a UPI ID yet — ask them to add it in the room.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handlePayWithUpi}
            disabled={!upiUrl}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-sm disabled:opacity-50"
          >
            Pay with UPI
          </button>
          {!isPaid && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={marking}
              className="flex-1 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-sm disabled:opacity-50"
            >
              {marking ? "Saving..." : "I've paid"}
            </button>
          )}
        </div>
      )}

      {showQr && upiUrl && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-slate-400">Scan with any UPI app</p>
          <QRDisplay url={upiUrl} size={160} />
          <button
            type="button"
            onClick={() => setShowQr(false)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Close
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
