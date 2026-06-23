import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinRoom } from "../api/rooms";
import { createFreshGuestSession } from "../lib/auth";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await createFreshGuestSession();
      await joinRoom(code, name.trim());
      navigate(`/room/${code.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Join the bill</h2>
        <p className="text-slate-400 mt-1">
          Room code: <span className="text-emerald-400 font-mono">{code}</span>
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Your name</span>
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5"
            placeholder="e.g. Rahul"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join room"}
        </button>
      </form>
    </div>
  );
}
