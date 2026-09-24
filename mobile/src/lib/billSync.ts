import {
  addBillItem,
  deleteBillItem,
  updateBill,
  updateBillItem,
  type Bill,
  type BillItem,
} from "../api/bills";
import { recalcBillFromItems } from "./billTotals";

/**
 * Checks whether an item ID is a client-generated temporary ID.
 */
export function isTempItemId(id: string): boolean {
  return id.startsWith("temp-");
}

/**
 * Creates a unique client-side temporary item ID.
 */
export function createTempItemId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Checks if a bill item has valid data ready to be synced with the server.
 */
export function isItemReadyToSync(item: BillItem): boolean {
  return (
    item.name.trim().length > 0 &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0 &&
    Number.isInteger(item.quantity) &&
    Number.isFinite(item.price) &&
    item.price > 0
  );
}

/**
 * Validates that all items in the bill meet minimal requirements before room creation.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateBillItems(items: BillItem[]): string | null {
  if (items.length === 0) {
    return "Add at least one item before continuing";
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = items.length > 1 ? `Item ${i + 1}` : "Each item";

    if (!item.name.trim()) {
      return `${label} needs a name`;
    }
    if (
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isInteger(item.quantity)
    ) {
      return `${label}: quantity must be greater than 0`;
    }
    if (!Number.isFinite(item.price) || item.price <= 0) {
      return `${label}: amount must be greater than 0`;
    }
  }

  return null;
}

/**
 * Checks if the draft bill has pending changes that have not yet been synced to lastSaved.
 */
export function hasPendingSync(draft: Bill, lastSaved: Bill): boolean {
  for (const item of draft.items) {
    if (isTempItemId(item.id)) {
      if (isItemReadyToSync(item)) return true;
      continue;
    }
    const saved = lastSaved.items.find((i) => i.id === item.id);
    if (
      !saved ||
      saved.name !== item.name ||
      saved.price !== item.price ||
      saved.quantity !== item.quantity
    ) {
      return true;
    }
  }

  return lastSaved.items.some(
    (saved) => !draft.items.some((item) => item.id === saved.id)
  );
}

/**
 * Merges a server bill response into the client draft, preserving local edits
 * and matching newly created server item IDs to temporary IDs.
 */
export function mergeDraftWithServer(
  serverBill: Bill,
  draft: Bill,
  syncedTempIds: Map<string, string>
): Bill {
  const items = draft.items.map((item) => {
    if (isTempItemId(item.id)) {
      const realId = syncedTempIds.get(item.id);
      if (realId) {
        const fromServer = serverBill.items.find((i) => i.id === realId);
        if (fromServer) return fromServer;
      }
      return item;
    }
    const fromServer = serverBill.items.find((i) => i.id === item.id);
    return fromServer ?? item;
  });

  return recalcBillFromItems({ ...serverBill, items });
}

/**
 * Checks whether two bills match exactly in all field values and items.
 */
export function billsMatchForSave(a: Bill, b: Bill): boolean {
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

/**
 * Synchronizes draft bill changes to the server (adds new items, updates modified, deletes removed).
 */
export async function persistBillToServer(
  lastSaved: Bill,
  draft: Bill
): Promise<{ serverBill: Bill; syncedTempIds: Map<string, string> }> {
  let serverBill = lastSaved;
  const syncedTempIds = new Map<string, string>();
  const draftIds = new Set(draft.items.map((item) => item.id));

  // 1. Delete removed items
  for (const savedItem of [...serverBill.items]) {
    if (!draftIds.has(savedItem.id)) {
      serverBill = await deleteBillItem(serverBill.id, savedItem.id);
    }
  }

  // 2. Add new items with temporary IDs
  for (const item of draft.items) {
    if (!isTempItemId(item.id) || !isItemReadyToSync(item)) continue;

    const beforeIds = new Set(serverBill.items.map((i) => i.id));
    serverBill = await addBillItem(serverBill.id, {
      name: item.name.trim(),
      price: item.price,
      quantity: item.quantity,
    });
    const added = serverBill.items.find((i) => !beforeIds.has(i.id));
    if (added) syncedTempIds.set(item.id, added.id);
  }

  // 3. Update existing modified items
  for (const item of draft.items) {
    const serverId = isTempItemId(item.id)
      ? syncedTempIds.get(item.id)
      : item.id;
    if (!serverId) continue;

    const saved = serverBill.items.find((i) => i.id === serverId);
    if (
      !saved ||
      saved.name !== item.name ||
      saved.price !== item.price ||
      saved.quantity !== item.quantity
    ) {
      serverBill = await updateBillItem(serverBill.id, serverId, {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });
    }
  }

  // 4. Update bill-level metadata
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

  return { serverBill, syncedTempIds };
}
