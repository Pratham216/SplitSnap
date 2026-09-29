import type { ParsedBill, TaxBreakdown } from "@zaptab/shared";

export interface ReconciliationResult {
  calculatedItemSubtotal: number;
  receiptSubtotal: number;
  totalTax: number;
  taxes: TaxBreakdown[];
  serviceCharge: number;
  calculatedGrandTotal: number;
  printedBillTotal?: number;
  roundedPayableTotal?: number;
  isItemSubtotalValid: boolean;
  requiresVerification: boolean;
  validationWarnings: string[];
}

export function toPaise(val: number | undefined | null): number {
  if (typeof val !== "number" || isNaN(val)) return 0;
  return Math.round(val * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export function reconcileBill(parsed: ParsedBill): ReconciliationResult {
  const warnings: string[] = [];

  // 1. Calculate item subtotal in integer paise
  const calculatedItemSubtotalPaise = parsed.items.reduce(
    (sum, item) => sum + toPaise(item.price),
    0
  );

  const receiptSubtotalInput = parsed.receiptSubtotal ?? parsed.subtotal ?? 0;
  const receiptSubtotalPaise = toPaise(receiptSubtotalInput);

  // 2. Calculate total tax by summing taxes[] array
  const taxes = parsed.taxes ?? [];
  const totalTaxPaise = taxes.reduce((sum, t) => sum + toPaise(t.amount), 0);

  // Detect if item line totals are tax-inclusive
  const isTaxInclusive =
    totalTaxPaise > 0 &&
    receiptSubtotalPaise > 0 &&
    Math.abs(calculatedItemSubtotalPaise - (receiptSubtotalPaise + totalTaxPaise)) <= 200;

  let isItemSubtotalValid = true;
  let requiresVerification = false;

  // 3. Validate extracted items total vs receipt subtotal
  if (receiptSubtotalPaise > 0) {
    const diffPaise = receiptSubtotalPaise - calculatedItemSubtotalPaise;
    if (diffPaise !== 0 && !isTaxInclusive) {
      isItemSubtotalValid = false;
      requiresVerification = true;
      const diffFormatted = (Math.abs(diffPaise) / 100).toFixed(2);
      const calcFormatted = (calculatedItemSubtotalPaise / 100).toFixed(2);
      const receiptFormatted = (receiptSubtotalPaise / 100).toFixed(2);

      if (diffPaise > 0) {
        warnings.push(
          `Extracted item subtotal (₹${calcFormatted}) does not match receipt subtotal (₹${receiptFormatted}). Difference: ₹${diffFormatted}. One or more items may have been missed.`
        );
      } else {
        warnings.push(
          `Extracted item subtotal (₹${calcFormatted}) exceeds receipt subtotal (₹${receiptFormatted}) by ₹${diffFormatted}. Extra line item may have been included.`
        );
      }
    }
  }

  // 4. Validate Quantity x Unit Price where unitPrice exists
  for (const item of parsed.items) {
    if (typeof item.unitPrice === "number" && item.unitPrice > 0 && item.quantity > 0) {
      const expectedLinePaise = Math.round(item.quantity * item.unitPrice * 100);
      const actualLinePaise = toPaise(item.price);
      if (Math.abs(expectedLinePaise - actualLinePaise) > 100) {
        warnings.push(
          `Item '${item.name}' line total (₹${item.price.toFixed(
            2
          )}) differs from ${item.quantity} × ₹${item.unitPrice.toFixed(2)} = ₹${(
            expectedLinePaise / 100
          ).toFixed(2)}.`
        );
      }
    }
  }

  const serviceChargePaise = toPaise(parsed.serviceCharge);
  const discountPaise = toPaise(parsed.discount);
  const tipPaise = toPaise(parsed.tip);

  const baseSubtotalPaise = isTaxInclusive
    ? calculatedItemSubtotalPaise
    : (receiptSubtotalPaise > 0 ? receiptSubtotalPaise : calculatedItemSubtotalPaise);

  const calculatedGrandTotalPaise = isTaxInclusive
    ? baseSubtotalPaise + serviceChargePaise + tipPaise - discountPaise
    : baseSubtotalPaise + totalTaxPaise + serviceChargePaise + tipPaise - discountPaise;

  // 5. Compare with printed & rounded totals
  const printedTotalInput = parsed.printedBillTotal ?? parsed.grandTotal;
  const printedTotalPaise = toPaise(printedTotalInput);
  const roundedTotalInput = parsed.roundedPayableTotal;
  const roundedTotalPaise = toPaise(roundedTotalInput);

  if (printedTotalPaise > 0) {
    const totalDiffPaise = Math.abs(calculatedGrandTotalPaise - printedTotalPaise);
    if (totalDiffPaise > 200) {
      // difference greater than ₹2.00
      warnings.push(
        `Calculated bill total (₹${(
          calculatedGrandTotalPaise / 100
        ).toFixed(2)}) differs from printed bill total (₹${(
          printedTotalPaise / 100
        ).toFixed(2)}).`
      );
    }
  }

  return {
    calculatedItemSubtotal: fromPaise(calculatedItemSubtotalPaise),
    receiptSubtotal: fromPaise(receiptSubtotalPaise),
    totalTax: fromPaise(totalTaxPaise),
    taxes,
    serviceCharge: fromPaise(serviceChargePaise),
    calculatedGrandTotal: fromPaise(calculatedGrandTotalPaise),
    printedBillTotal: printedTotalInput !== undefined ? fromPaise(printedTotalPaise) : undefined,
    roundedPayableTotal: roundedTotalInput !== undefined ? fromPaise(roundedTotalPaise) : undefined,
    isItemSubtotalValid,
    requiresVerification,
    validationWarnings: warnings,
  };
}
