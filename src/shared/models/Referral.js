import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referralCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    referrerReward: {
      type: Number,
      default: 0,
    },
    refereeReward: {
      type: Number,
      default: 0,
    },
    referrerRewardPaid: {
      type: Boolean,
      default: false,
    },
    refereeRewardPaid: {
      type: Boolean,
      default: false,
    },
    firstOrderDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ referrer: 1 });
referralSchema.index({ referee: 1 });
referralSchema.index({ status: 1 });

export default mongoose.model("Referral", referralSchema);
