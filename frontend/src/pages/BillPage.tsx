import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBill,
  getBillStatus,
  updateBill,
  addBillItem,
  updateBillItem,
  deleteBillItem,
  retryBill,
  type Bill,
  type BillItem,
} from "../api/bills";
import { createRoom } from "../api/rooms";
import { getCurrentUser } from "../api/users";
import { recalcBillFromItems, recalcGrandTotal, sumItemPrices, applyItemFieldUpdate } from "../lib/billTotals";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";

export default function BillPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(true);

  const { data: status } = useQuery({
    queryKey: ["bill-status", id],
    queryFn: () => getBillStatus(id!),
    enabled: !!id && polling,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "processing" || s === "uploading" ? 1500 : false;
    },
  });

  useEffect(() => {
    if (status?.status === "parsed" || status?.status === "failed") {
      setPolling(false);
      queryClient.invalidateQueries({ queryKey: ["bill", id] });
    }
  }, [status, id, queryClient]);

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => getBill(id!),
    enabled: !!id,
  });

  if (!id) return null;

  if (isLoading && !bill) {
    return <LoadingState />;
  }

  if (status?.status === "processing" || status?.status === "uploading") {
    return <ProcessingState />;
  }

  if (status?.status === "failed" || bill?.status === "failed") {
    return (
      <FailedState
        message={bill?.errorMessage || status?.errorMessage}
        onRetry={async () => {
          await retryBill(id);
          setPolling(true);
          queryClient.invalidateQueries({ queryKey: ["bill-status", id] });
        }}
      />
    );
  }

  if (!bill) return null;

  return <BillEditor key={bill.id} bill={bill} />;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400">Loading bill...</p>
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      <h2 className="text-xl font-semibold">Reading your bill...</h2>
      <p className="text-slate-400 text-sm">
        Running OCR and extracting items. This may take a few seconds.
      </p>
    </div>
  );
}

function FailedState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center space-y-4">
      <h2 className="text-lg font-semibold text-red-300">Processing failed</h2>
      <p className="text-sm text-red-200/80">{message || "Something went wrong."}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm"
      >
        Retry
      </button>
    </div>
  );
}

function billsMatchForSave(a: Bill, b: Bill): boolean {
  if (
    a.restaurantName !== b.restaurantName ||
    a.billDate !== b.billDate ||
    a.tax !== b.tax ||
    a.serviceCharge !== b.serviceCharge ||
    a.subtotal !== b.subtotal ||
    a.grandTotal !== b.grandTotal ||
    a.items.length !== b.items.length
  ) {
    return false;
  }
  return a.items.every((item, i) => {
    const other = b.items[i];
    return (
      item.id === other.id &&
      item.name === other.name &&
      item.price === other.price &&
      item.quantity === other.quantity
    );
  });
}

async function persistBillToServer(lastSaved: Bill, draft: Bill): Promise<Bill> {
  let serverBill = lastSaved;

  for (const item of draft.items) {
    const saved = serverBill.items.find((i) => i.id === item.id);
    if (
      !saved ||
      saved.name !== item.name ||
      saved.price !== item.price ||
      saved.quantity !== item.quantity
    ) {
      serverBill = await updateBillItem(serverBill.id, item.id, {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });
    }
  }

  const billPatch: Parameters<typeof updateBill>[1] = {};
  if (serverBill.restaurantName !== draft.restaurantName) {
    billPatch.restaurantName = draft.restaurantName;
  }
  if (serverBill.billDate !== draft.billDate) {
    billPatch.billDate = draft.billDate;
  }
  if (serverBill.tax !== draft.tax) billPatch.tax = draft.tax;
  if (serverBill.serviceCharge !== draft.serviceCharge) {
    billPatch.serviceCharge = draft.serviceCharge;
  }
  if (serverBill.subtotal !== draft.subtotal) billPatch.subtotal = draft.subtotal;
  if (serverBill.grandTotal !== draft.grandTotal) {
    billPatch.grandTotal = draft.grandTotal;
  }

  if (Object.keys(billPatch).length > 0) {
    serverBill = await updateBill(serverBill.id, billPatch);
  }

  return serverBill;
}

function BillEditor({ bill: initialBill }: { bill: Bill }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = initialBill.id;
  const [draft, setDraft] = useState(initialBill);
  const [hostName, setHostName] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (currentUser?.name && !hostName) {
      setHostName(currentUser.name);
    }
  }, [currentUser?.name, hostName]);

  const draftRef = useRef(draft);
  const lastSavedRef = useRef(initialBill);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);

  draftRef.current = draft;

  const scheduleSave = useDebouncedCallback(() => {
    void flushSave();
  }, 500);

  async function flushSave() {
    if (!dirtyRef.current || savingRef.current) return;

    const snapshot = draftRef.current;
    savingRef.current = true;
    setSaveError(null);

    try {
      const serverBill = await persistBillToServer(lastSavedRef.current, snapshot);
      lastSavedRef.current = serverBill;

      if (billsMatchForSave(draftRef.current, snapshot)) {
        dirtyRef.current = false;
        setDraft(serverBill);
        queryClient.setQueryData(["bill", id], serverBill);
      } else {
        scheduleSave();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      savingRef.current = false;
    }
  }

  function updateDraft(updater: (current: Bill) => Bill) {
    dirtyRef.current = true;
    setDraft((current) => updater(current));
    scheduleSave();
  }

  function handleItemChange(
    itemId: string,
    data: { name?: string; price?: number; quantity?: number }
  ) {
    updateDraft((current) => {
      const items = current.items.map((item) =>
        item.id === itemId ? applyItemFieldUpdate(item, data) : item
      );
      return recalcBillFromItems({ ...current, items });
    });
  }

  function handleBillFieldChange(
    fields: Partial<
      Pick<
        Bill,
        "restaurantName" | "billDate" | "tax" | "serviceCharge" | "subtotal" | "grandTotal"
      >
    >
  ) {
    updateDraft((current) => recalcGrandTotal({ ...current, ...fields }));
  }

  async function handleAddItem() {
    try {
      const serverBill = await addBillItem(id, {
        name: "New item",
        price: 0,
        quantity: 1,
      });
      lastSavedRef.current = serverBill;
      dirtyRef.current = false;
      setDraft(recalcBillFromItems(serverBill));
      queryClient.setQueryData(["bill", id], serverBill);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const serverBill = await deleteBillItem(id, itemId);
      lastSavedRef.current = serverBill;
      dirtyRef.current = false;
      setDraft(recalcBillFromItems(serverBill));
      queryClient.setQueryData(["bill", id], serverBill);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  const itemsTotal = sumItemPrices(draft.items);
  const displaySubtotal = draft.subtotal ?? itemsTotal;
  const displayGrandTotal =
    draft.grandTotal ?? displaySubtotal + draft.tax + draft.serviceCharge;

  async function handleCreateRoom() {
    if (!hostName.trim()) {
      setRoomError("Enter your name to create the room");
      return;
    }
    if (dirtyRef.current) {
      await flushSave();
    }
    setRoomError(null);
    setCreatingRoom(true);
    try {
      const room = await createRoom(id, hostName.trim());
      navigate(`/room/${room.code}`);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Review your bill</h2>
          <p className="text-slate-400 text-sm mt-1">
            Fix any mistakes before sharing with friends.
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
          Parsed
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Restaurant"
          value={draft.restaurantName}
          onChange={(v) => handleBillFieldChange({ restaurantName: v })}
        />
        <Field
          label="Date"
          value={draft.billDate}
          onChange={(v) => handleBillFieldChange({ billDate: v })}
        />
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
          <h3 className="font-medium">Items</h3>
          <button
            onClick={handleAddItem}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            + Add item
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {draft.items.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">
              No items extracted. Add items manually.
            </p>
          )}
          {draft.items.map((item) => (
            <BillItemRow
              key={item.id}
              item={item}
              onChange={handleItemChange}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>

        <div className="bg-slate-900/50 px-4 py-2 text-xs text-slate-500 grid grid-cols-12 gap-2">
          <span className="col-span-6">Item</span>
          <span className="col-span-2">Qty</span>
          <span className="col-span-3">Amount</span>
          <span className="col-span-1" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-800 p-4 bg-slate-900/50">
        <NumberField
          label="Tax (GST)"
          value={draft.tax}
          onChange={(v) => handleBillFieldChange({ tax: v })}
        />
        <NumberField
          label="Service charge"
          value={draft.serviceCharge}
          onChange={(v) => handleBillFieldChange({ serviceCharge: v })}
        />
        <NumberField
          label="Subtotal"
          value={displaySubtotal}
          onChange={(v) => handleBillFieldChange({ subtotal: v })}
        />
        <NumberField
          label="Grand total"
          value={displayGrandTotal}
          onChange={(v) => handleBillFieldChange({ grandTotal: v })}
        />
      </div>

      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-300/80">Items total</p>
            <p className="text-2xl font-bold text-emerald-300">
              ₹{itemsTotal.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm"
            placeholder="Your name (host)"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
          {currentUser?.upiId && (
            <div className="flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-emerald-300/90 flex items-center">
              {currentUser.upiId}
            </div>
          )}
          <button
            onClick={handleCreateRoom}
            disabled={creatingRoom}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-sm disabled:opacity-50 whitespace-nowrap sm:w-auto w-full"
          >
            {creatingRoom ? "Creating..." : "Create room & share"}
          </button>
        </div>

        {roomError && <p className="text-sm text-red-300">{roomError}</p>}
        {saveError && <p className="text-sm text-amber-300">{saveError}</p>}
      </div>
    </div>
  );
}

function BillItemRow({
  item,
  onChange,
  onDelete,
}: {
  item: BillItem;
  onChange: (itemId: string, data: Partial<BillItem>) => void;
  onDelete: (itemId: string) => void;
}) {
  const [qtyText, setQtyText] = useState(String(item.quantity));
  const [priceText, setPriceText] = useState(String(item.price));
  const priceFocusedRef = useRef(false);

  useEffect(() => {
    setQtyText(String(item.quantity));
  }, [item.quantity]);

  useEffect(() => {
    if (!priceFocusedRef.current) {
      setPriceText(String(item.price));
    }
  }, [item.price]);

  function applyQuantity(quantity: number) {
    setQtyText(String(quantity));
    onChange(item.id, { quantity });
  }

  function commitQty(raw: string) {
    const parsed = parseInt(raw, 10);
    const quantity = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
    applyQuantity(quantity);
  }

  function commitPrice(raw: string) {
    const parsed = parseFloat(raw);
    const price = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setPriceText(String(price));
    onChange(item.id, { price });
  }

  return (
    <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
      <input
        className="col-span-6 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        value={item.name}
        onChange={(e) => onChange(item.id, { name: e.target.value })}
      />
      <input
        type="text"
        inputMode="numeric"
        className="col-span-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        value={qtyText}
        onChange={(e) => {
          setQtyText(e.target.value);
          const parsed = parseInt(e.target.value, 10);
          if (Number.isFinite(parsed) && parsed >= 1) {
            applyQuantity(parsed);
          }
        }}
        onBlur={() => commitQty(qtyText)}
      />
      <div className="col-span-3 flex items-center gap-1">
        <span className="text-slate-500 text-sm">₹</span>
        <input
          type="text"
          inputMode="decimal"
          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={priceText}
          onFocus={() => {
            priceFocusedRef.current = true;
          }}
          onChange={(e) => {
            setPriceText(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (Number.isFinite(parsed) && parsed >= 0) {
              onChange(item.id, { price: parsed });
            }
          }}
          onBlur={() => {
            priceFocusedRef.current = false;
            commitPrice(priceText);
          }}
        />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="col-span-1 text-slate-500 hover:text-red-400 text-lg"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-slate-500">₹</span>
        <input
          type="text"
          inputMode="decimal"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (Number.isFinite(parsed) && parsed >= 0) {
              onChange(parsed);
            }
          }}
          onBlur={() => {
            const parsed = parseFloat(text);
            const final = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            setText(String(final));
            onChange(final);
          }}
        />
      </div>
    </label>
  );
}
