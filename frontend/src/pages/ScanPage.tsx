import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadBill } from "../api/bills";

export default function ScanPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { id } = await uploadBill(file);
      navigate(`/bill/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Scan your bill</h2>
        <p className="text-slate-400 mt-1">
          Take a photo or upload a receipt. We'll extract items automatically.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-colors
          ${dragOver ? "border-emerald-400 bg-emerald-400/5" : "border-slate-700 hover:border-slate-500"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,.pdf"
          capture="environment"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="text-5xl mb-4">📸</div>
        <p className="text-lg font-medium">
          {uploading ? "Uploading..." : "Tap to upload or drop a receipt"}
        </p>
        <p className="text-sm text-slate-500 mt-2">JPG, PNG up to 10MB</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300 mb-2">How it works</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Upload a clear photo of your restaurant bill</li>
          <li>OCR extracts items, prices, and tax</li>
          <li>Review and edit before sharing with friends</li>
        </ol>
      </div>
    </div>
  );
}
