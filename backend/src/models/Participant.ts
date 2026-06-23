import mongoose, { Schema, Types } from "mongoose";

export interface IParticipant {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  guestId: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    guestId: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

participantSchema.index({ roomId: 1, guestId: 1 }, { unique: true });

export const Participant = mongoose.model<IParticipant>(
  "Participant",
  participantSchema
);
