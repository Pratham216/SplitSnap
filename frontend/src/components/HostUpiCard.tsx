import { useState } from "react";
import { isValidUpiId } from "@splitsnap/shared";
import { updateHostUpi } from "../api/rooms";

interface HostUpiCardProps {
  roomCode: string;
  hostUpiId: string;
  onUpdated: (hostUpiId: string) => void;
  variant?: "banner" | "inline";
}

export default function HostUpiCard({
  roomCode,
  hostUpiId,
  onUpdated,
  variant = "banner",
}: HostUpiCardProps) {
  const [upiId, setUpiId] = useState(hostUpiId);
  const [editing, setEditing] = useState(!hostUpiId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const trimmed = upiId.trim();
    if (trimmed && !isValidUpiId(trimmed)) {
      setError("Use format: name@bank (e.g. you@ybl)");
      return;
    }

    setSaving(true);
    try {
      const room = await updateHostUpi(roomCode, trimmed);
      onUpdated(room.hostUpiId);
      setUpiId(room.hostUpiId);
      setEditing(!room.hostUpiId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save UPI ID");
    } finally {
      setSaving(false);
    }
  }

  if (!editing && hostUpiId) {
    return (
      <div
        className={
          variant === "banner"
            ? "rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4 flex items-center justify-between gap-3"
            : "text-sm"
        }
      >
        <div>
          <p className="text-xs text-neutral-400">Your UPI ID</p>
          <p className="font-mono text-amber-300">{hostUpiId}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-neutral-400 hover:text-neutral-200 shrink-0"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "banner"
          ? "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
          : "space-y-3"
      }
    >
      <div>
        <h3 className="font-medium text-amber-200 text-sm">
          Add your UPI ID so friends can pay you
        </h3>
        <p className="text-xs text-amber-200/70 mt-1">
          e.g. yourname@ybl, phone@paytm
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 input-field font-mono"
          placeholder="yourname@ybl"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-4 py-2 text-sm"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {hostUpiId && (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setUpiId(hostUpiId);
            setError(null);
          }}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          Cancel
        </button>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
