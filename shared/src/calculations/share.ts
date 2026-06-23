export interface BillForShare {
  items: { id: string; price: number; quantity: number }[];
  subtotal?: number;
  tax: number;
  serviceCharge: number;
}

/** itemId → { guestId → quantity claimed } */
export type ItemClaims = Record<string, number>;
export type SelectionsMap = Record<string, ItemClaims>;

export interface ShareBreakdown {
  itemsTotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  ratio: number;
}

export function getItemUnitPrice(item: { price: number; quantity: number }): number {
  return item.quantity > 0 ? item.price / item.quantity : item.price;
}

export function getTotalClaimedForItem(
  selections: SelectionsMap,
  itemId: string
): number {
  const claims = selections[itemId];
  if (!claims) return 0;
  return Object.values(claims).reduce((sum, qty) => sum + qty, 0);
}

export function getMyQuantity(
  selections: SelectionsMap,
  itemId: string,
  guestId: string
): number {
  return selections[itemId]?.[guestId] ?? 0;
}

export function calculatePersonShare(
  bill: BillForShare,
  selections: SelectionsMap,
  guestId: string
): ShareBreakdown {
  const itemsTotal = bill.items.reduce((sum, item) => sum + item.price, 0);
  const subtotal = bill.subtotal ?? itemsTotal;

  const myItemsTotal = bill.items.reduce((sum, item) => {
    const myQty = getMyQuantity(selections, item.id, guestId);
    return sum + getItemUnitPrice(item) * myQty;
  }, 0);

  const ratio = subtotal > 0 ? myItemsTotal / subtotal : 0;
  const tax = bill.tax * ratio;
  const serviceCharge = bill.serviceCharge * ratio;

  return {
    itemsTotal: myItemsTotal,
    tax,
    serviceCharge,
    total: myItemsTotal + tax + serviceCharge,
    ratio,
  };
}

export function getUnclaimedUnitsCount(
  bill: BillForShare,
  selections: SelectionsMap
): number {
  return bill.items.reduce((count, item) => {
    const claimed = getTotalClaimedForItem(selections, item.id);
    return count + Math.max(0, item.quantity - claimed);
  }, 0);
}
