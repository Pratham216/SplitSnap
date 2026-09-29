import mongoose, { Schema, Types } from "mongoose";
import type { BillStatus, TaxBreakdown } from "@zaptab/shared";

export interface IBillItem extends Types.Subdocument {
  _id: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  unitPrice?: number;
}

export interface IBill {
  _id: Types.ObjectId;
  restaurantName: string;
  billDate: string;
  items: Types.DocumentArray<IBillItem>;
  subtotal?: number;
  taxes: TaxBreakdown[];
  serviceCharge: number;
  discount?: number;
  tip?: number;
  grandTotal?: number;
  receiptSubtotal?: number;
  calculatedItemSubtotal?: number;
  printedBillTotal?: number;
  roundedPayableTotal?: number;
  isItemSubtotalValid?: boolean;
  requiresVerification?: boolean;
  validationWarnings?: string[];
  isManuallyModified?: boolean;
  ocrText?: string;
  status: BillStatus;
  errorMessage?: string;
  imagePath?: string;
  tempFilePath?: string;
  tempFileExpiresAt?: Date;
  cloudinaryUrl?: string;
  createdByClerkId?: string;
  createdByGuestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billItemSchema = new Schema<IBillItem>(
  {
    name: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0 },
  },
  { _id: true }
);

const taxBreakdownSchema = new Schema<TaxBreakdown>(
  {
    name: { type: String, required: true, default: "Tax" },
    rate: { type: Number, min: 0 },
    amount: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const billSchema = new Schema<IBill>(
  {
    restaurantName: { type: String, default: "" },
    billDate: { type: String, default: "" },
    items: [billItemSchema],
    subtotal: { type: Number },
    taxes: { type: [taxBreakdownSchema], default: [] },
    serviceCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    grandTotal: { type: Number },
    receiptSubtotal: { type: Number },
    calculatedItemSubtotal: { type: Number },
    printedBillTotal: { type: Number },
    roundedPayableTotal: { type: Number },
    isItemSubtotalValid: { type: Boolean, default: true },
    requiresVerification: { type: Boolean, default: false },
    validationWarnings: { type: [String], default: [] },
    isManuallyModified: { type: Boolean, default: false },
    ocrText: { type: String },
    status: {
      type: String,
      enum: ["uploading", "processing", "parsed", "failed"],
      default: "uploading",
    },
    errorMessage: { type: String },
    imagePath: { type: String },
    tempFilePath: { type: String },
    tempFileExpiresAt: { type: Date },
    cloudinaryUrl: { type: String },
    createdByClerkId: { type: String, index: true },
    createdByGuestId: { type: String, index: true },
  },
  { timestamps: true }
);

billSchema.index({ createdByClerkId: 1, createdAt: -1 });
billSchema.index({ createdByGuestId: 1, createdAt: -1 });

export const Bill = mongoose.model<IBill>("Bill", billSchema);
