import { z } from "zod";

export const BillItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().positive().default(1),
});

export const ParsedBillSchema = z.object({
  restaurantName: z.string().optional().default(""),
  billDate: z.string().optional().default(""),
  items: z.array(BillItemSchema).default([]),
  subtotal: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().default(0),
  serviceCharge: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative().optional(),
});

export type BillItem = z.infer<typeof BillItemSchema>;
export type ParsedBill = z.infer<typeof ParsedBillSchema>;

export const BillStatusSchema = z.enum([
  "uploading",
  "processing",
  "parsed",
  "failed",
]);

export type BillStatus = z.infer<typeof BillStatusSchema>;
