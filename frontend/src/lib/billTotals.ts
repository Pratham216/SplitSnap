import type { Bill } from "../api/bills";
import type { BillItem } from "../api/bills";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getLineUnitPrice(item: { price: number; quantity: number }): number {
  return item.quantity > 0 ? item.price / item.quantity : item.price;
}

/** When qty changes, scale line total from per-unit rate. Price field stays line total. */
export function applyItemFieldUpdate(
  item: BillItem,
  data: { name?: string; price?: number; quantity?: number }
): BillItem {
  const next = { ...item, ...data };

  if (data.quantity !== undefined && data.price === undefined) {
    const unitPrice = getLineUnitPrice(item);
    next.price = roundMoney(unitPrice * next.quantity);
  }

  return next;
}

export function sumItemPrices(items: { price: number }[]): number {  return items.reduce(
    (sum, item) => sum + (Number.isFinite(item.price) ? item.price : 0),
    0
  );
}

export function recalcBillFromItems(bill: Bill): Bill {
  const subtotal = sumItemPrices(bill.items);
  const grandTotal = subtotal + bill.tax + bill.serviceCharge;
  return { ...bill, subtotal, grandTotal };
}

export function recalcGrandTotal(bill: Bill): Bill {
  const subtotal = bill.subtotal ?? sumItemPrices(bill.items);
  return { ...bill, grandTotal: subtotal + bill.tax + bill.serviceCharge };
}
