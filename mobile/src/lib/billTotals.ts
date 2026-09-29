import type { Bill, BillItem } from "../api/bills";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getLineUnitPrice(item: { price: number; quantity: number }): number {
  return item.quantity > 0 ? item.price / item.quantity : item.price;
}

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

export function sumItemPrices(items: { price: number }[]): number {
  return items.reduce(
    (sum, item) => sum + (Number.isFinite(item.price) ? item.price : 0),
    0
  );
}

export function getTotalTaxFromBill(bill: { tax?: number; taxes?: { amount: number }[] }): number {
  if (bill.taxes && bill.taxes.length > 0) {
    return roundMoney(bill.taxes.reduce((sum, t) => sum + (t.amount || 0), 0));
  }
  return bill.tax ?? 0;
}

export function recalcBillFromItems(bill: Bill): Bill {
  const subtotal = sumItemPrices(bill.items);
  const totalTax = getTotalTaxFromBill(bill);
  const grandTotal = subtotal + totalTax + bill.serviceCharge;
  return { ...bill, subtotal, tax: totalTax, grandTotal };
}

export function recalcGrandTotal(bill: Bill): Bill {
  const subtotal = bill.subtotal ?? sumItemPrices(bill.items);
  const totalTax = getTotalTaxFromBill(bill);
  return { ...bill, tax: totalTax, grandTotal: subtotal + totalTax + bill.serviceCharge };
}

export function getBillDisplayTotal(bill: Bill): number {
  const itemsTotal = sumItemPrices(bill.items);
  const subtotal = bill.subtotal ?? itemsTotal;
  const totalTax = getTotalTaxFromBill(bill);
  return bill.grandTotal ?? subtotal + totalTax + bill.serviceCharge;
}
