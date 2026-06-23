import mongoose, { Schema, Types } from "mongoose";

export interface IItemSelection {
  itemId: string;
  guestId: string;
  quantity: number;
}

export interface IRoom {
  _id: Types.ObjectId;
  code: string;
  billId: Types.ObjectId;
  hostGuestId: string;
  hostUpiId?: string;
  paidGuestIds: string[];
  appOrigin?: string;
  status: "open" | "closed";
  selections: IItemSelection[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    billId: { type: Schema.Types.ObjectId, ref: "Bill", required: true },
    hostGuestId: { type: String, required: true },
    hostUpiId: { type: String },
    paidGuestIds: { type: [String], default: [] },
    appOrigin: { type: String },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    selections: {
      type: [
        {
          itemId: { type: String, required: true },
          guestId: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1, default: 1 },
        },
      ],
      default: [],
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const Room = mongoose.model<IRoom>("Room", roomSchema);
