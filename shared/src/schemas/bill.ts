import { z } from "zod";

const nullableNumber = (defaultValue?: number) => {
  if (defaultValue !== undefined) {
    return z.preprocess(
      (val) => (val === null || val === undefined ? defaultValue : val),
      z.number().nonnegative().default(defaultValue)
    );
  }
  return z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().nonnegative().optional()
  );
};

export const BillItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.preprocess(
    (val) => (val === null || val === undefined ? 1 : val),
    z.number().positive().default(1)
  ),
  unitPrice: nullableNumber(),
});

export const TaxBreakdownSchema = z.object({
  name: z.string().min(1),
  rate: nullableNumber(),
  amount: z.preprocess(
    (val) => (val === null || val === undefined ? 0 : val),
    z.number().nonnegative().default(0)
  ),
});

export const ParsedBillSchema = z.object({
  restaurantName: z.preprocess(
    (val) => (val === null || val === undefined ? "" : String(val)),
    z.string().optional().default("")
  ),
  billDate: z.preprocess(
    (val) => (val === null || val === undefined ? "" : String(val)),
    z.string().optional().default("")
  ),
  items: z.array(BillItemSchema).default([]),
  subtotal: nullableNumber(),
  taxes: z.array(TaxBreakdownSchema).default([]),
  serviceCharge: nullableNumber(0),
  discount: nullableNumber(0),
  tip: nullableNumber(0),
  grandTotal: nullableNumber(),
  receiptSubtotal: nullableNumber(),
  calculatedItemSubtotal: nullableNumber(),
  printedBillTotal: nullableNumber(),
  roundedPayableTotal: nullableNumber(),
  isItemSubtotalValid: z.boolean().optional().default(true),
  requiresVerification: z.boolean().optional().default(false),
  validationWarnings: z.array(z.string()).optional().default([]),
  isManuallyModified: z.boolean().optional().default(false),
});

export type BillItem = z.infer<typeof BillItemSchema>;
export type TaxBreakdown = z.infer<typeof TaxBreakdownSchema>;
export type ParsedBill = z.infer<typeof ParsedBillSchema>;

export const BillStatusSchema = z.enum([
  "uploading",
  "processing",
  "parsed",
  "failed",
]);

export type BillStatus = z.infer<typeof BillStatusSchema>;
