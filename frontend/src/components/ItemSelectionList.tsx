import {
  calculatePersonShare,
  getItemUnitPrice,
  getMyQuantity,
  getTotalClaimedForItem,
  getUnclaimedUnitsCount,
} from "@splitsnap/shared";
import type { Bill, BillItem } from "../api/bills";
import type { Participant, Room } from "../api/rooms";

export function applySelectionChange(
  room: Room,
  itemId: string,
  guestId: string,
  quantity: number
): Room {
  const selections = { ...room.selections };
  const entry = { ...(selections[itemId] ?? {}) };

  if (quantity <= 0) {
    delete entry[guestId];
  } else {
    entry[guestId] = quantity;
  }

  if (Object.keys(entry).length === 0) {
    delete selections[itemId];
  } else {
    selections[itemId] = entry;
  }

  return { ...room, selections };
}

interface ItemSelectionListProps {
  bill: Bill;
  selections: Room["selections"];
  participants: Participant[];
  myGuestId: string | null;
  onSetQuantity: (itemId: string, quantity: number) => void;
  updatingItemId: string | null;
}

function QuantityStepper({
  value,
  min,
  max,
  disabled,
  onChange,
  compact,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 ${compact ? "" : "shrink-0"}`}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function ClaimBadges({
  item,
  selections,
  participants,
  myGuestId,
}: {
  item: BillItem;
  selections: Room["selections"];
  participants: Participant[];
  myGuestId: string | null;
}) {
  const claims = selections[item.id];
  if (!claims) return null;

  const participantByGuestId = new Map(
    participants.map((p) => [p.guestId, p])
  );

  return (
    <>
      {Object.entries(claims).map(([guestId, qty]) => {
        const person = participantByGuestId.get(guestId);
        if (!person || qty <= 0) return null;
        const isMine = guestId === myGuestId;
        return (
          <span
            key={guestId}
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              isMine
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {person.name}
            {qty > 1 || item.quantity > 1 ? ` ×${qty}` : ""}
          </span>
        );
      })}
    </>
  );
}

export default function ItemSelectionList({
  bill,
  selections,
  participants,
  myGuestId,
  onSetQuantity,
  updatingItemId,
}: ItemSelectionListProps) {
  const billForShare = {
    items: bill.items.map((i) => ({
      id: i.id,
      price: i.price,
      quantity: i.quantity,
    })),
    subtotal: bill.subtotal,
    tax: bill.tax,
    serviceCharge: bill.serviceCharge,
  };

  const myShare = myGuestId
    ? calculatePersonShare(billForShare, selections, myGuestId)
    : null;

  const unclaimedUnits = getUnclaimedUnitsCount(billForShare, selections);

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium">Tap what you had</h3>
        {unclaimedUnits > 0 && (
          <span className="text-xs text-amber-400/90">
            {unclaimedUnits} unclaimed
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-800">
        {bill.items.map((item) => {
          const myQty = myGuestId
            ? getMyQuantity(selections, item.id, myGuestId)
            : 0;
          const totalClaimed = getTotalClaimedForItem(selections, item.id);
          const remaining = item.quantity - totalClaimed;
          const maxForMe = myQty + remaining;
          const isUpdating = updatingItemId === item.id;
          const unitPrice = getItemUnitPrice(item);
          const isMultiQty = item.quantity > 1;
          const isFullyTaken = myQty === 0 && remaining === 0;
          const canInteract =
            !isUpdating && !!myGuestId && !isFullyTaken;

          function handleToggle() {
            if (!canInteract) return;
            if (myQty > 0) {
              onSetQuantity(item.id, 0);
            } else {
              onSetQuantity(item.id, 1);
            }
          }

          return (
            <div
              key={item.id}
              role={canInteract ? "button" : undefined}
              tabIndex={canInteract ? 0 : undefined}
              onClick={canInteract ? handleToggle : undefined}
              onKeyDown={
                canInteract
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle();
                      }
                    }
                  : undefined
              }
              className={`flex gap-3 px-4 py-3 text-sm transition-colors ${
                myQty > 0 && isMultiQty ? "items-start" : "items-center"
              } ${canInteract ? "cursor-pointer" : "cursor-default"} ${
                myQty > 0 ? "bg-emerald-500/10" : "hover:bg-slate-900/30"
              }`}
            >
              <div
                className={`shrink-0 ${myQty > 0 && isMultiQty ? "pt-0.5" : ""}`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={myQty > 0}
                  disabled={!canInteract}
                  onChange={(e) =>
                    onSetQuantity(item.id, e.target.checked ? 1 : 0)
                  }
                  className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/50 disabled:opacity-50"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={
                      canInteract || myQty > 0 ? "text-slate-100" : "text-slate-400"
                    }
                  >
                    {isMultiQty && (
                      <span className="text-slate-500">{item.quantity}× </span>
                    )}
                    {item.name}
                  </span>
                  <ClaimBadges
                    item={item}
                    selections={selections}
                    participants={participants}
                    myGuestId={myGuestId}
                  />
                </div>

                {isMultiQty && myQty > 0 && (
                  <div
                    className="flex items-center gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-slate-400">You had</span>
                    <QuantityStepper
                      compact
                      value={myQty}
                      min={0}
                      max={maxForMe}
                      disabled={isUpdating || !myGuestId}
                      onChange={(qty) => onSetQuantity(item.id, qty)}
                    />
                    <span className="text-xs text-slate-500">
                      · ₹{unitPrice.toFixed(2)} each
                    </span>
                  </div>
                )}
              </div>

              <span className="text-slate-300 shrink-0">
                ₹{item.price.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {myShare && (
        <div className="bg-emerald-500/10 border-t border-emerald-500/20 px-4 py-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-300">
              Your share
            </span>
            <span className="text-2xl font-bold text-emerald-300">
              ₹{myShare.total.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-emerald-300/70">
            Items ₹{myShare.itemsTotal.toFixed(2)}
            {myShare.tax > 0 && ` · Tax ₹${myShare.tax.toFixed(2)}`}
            {myShare.serviceCharge > 0 &&
              ` · Service ₹${myShare.serviceCharge.toFixed(2)}`}
          </p>
        </div>
      )}
    </div>
  );
}
