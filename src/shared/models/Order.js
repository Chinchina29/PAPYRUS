import mongoose from "mongoose";
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  actualQuantity: {
    type: Number,
    default: function () {
      return this.quantity;
    },
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["Available", "Out of Stock"],
    default: "Available",
  },
  itemStatus: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
    ],
    default: "Pending",
  },
  cancelledAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
    maxlength: 500,
  },
  returnRequestStatus: {
    type: String,
    enum: ["None", "Requested", "Approved", "Rejected"],
    default: "None",
  },
  returnRequestedAt: {
    type: Date,
  },
  returnReason: {
    type: String,
    maxlength: 500,
  },
  returnComments: {
    type: String,
    maxlength: 500,
  },
  returnApprovedAt: {
    type: Date,
  },
  returnRejectedAt: {
    type: Date,
  },
  returnRejectionReason: {
    type: String,
    maxlength: 500,
  },
  returnedAt: {
    type: Date,
  },
});
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["COD", "Razorpay", "PayPal", "UPI", "Wallet", "Card"],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["Pending", "Paid", "Failed", "Refunded", "Processing"],
      default: "Pending",
    },
    paymentDetails: {
      gateway: {
        type: String,
        enum: ["razorpay", "paypal", "cod"],
      },
      transactionId: String,
      paymentOrderId: String,
      paidAt: Date,
      amount: Number,
      currency: {
        type: String,
        default: "INR",
      },
    },
    paymentAttempts: {
      type: Number,
      default: 0,
    },
    paymentFailureReason: {
      type: String,
      maxlength: 500,
    },
    webhookProcessed: {
      type: Boolean,
      default: false,
    },
    webhookProcessedAt: {
      type: Date,
    },
    lastModifiedBy: {
      type: String,
      enum: ["user", "admin", "system"],
      default: "user",
    },
    modificationHistory: [
      {
        action: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        actor: String,
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],
    appliedCoupon: {
      code: String,
      discountType: String,
      discountAmount: Number,
      discountPercentage: Number,
    },
    returnProcessedAmount: {
      type: Number,
      default: 0,
    },
    partialReturnAllowed: {
      type: Boolean,
      default: true,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Pending",
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderNotes: {
      type: String,
      maxlength: 500,
    },
    trackingNumber: {
      type: String,
    },
    shippedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
    },
    returnedAt: {
      type: Date,
    },
    returnReason: {
      type: String,
      maxlength: 500,
    },
    returnComments: {
      type: String,
      maxlength: 500,
    },
    returnRequestStatus: {
      type: String,
      enum: ["None", "Requested", "Approved", "Rejected"],
      default: "None",
    },
    returnRequestedAt: {
      type: Date,
    },
    returnApprovedAt: {
      type: Date,
    },
    returnRejectedAt: {
      type: Date,
    },
    returnRejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
orderSchema.index({ orderId: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1, paymentAttempts: 1 });
orderSchema.index({ orderStatus: 1, returnRequestStatus: 1 });
orderSchema.index({ webhookProcessed: 1 });
orderSchema.index({ "paymentDetails.transactionId": 1 });
orderSchema.pre("validate", function () {
  if (!this.orderId) {
    this.orderId = `PY-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
  }
});
orderSchema.virtual("displayStatus").get(function () {
  if (this.orderStatus === "Delivered") {
    const hasCancelledOrReturned = this.items.some(
      (item) =>
        item.itemStatus === "Cancelled" ||
        item.itemStatus === "Returned" ||
        item.cancelledAt ||
        item.returnRequestStatus === "Approved",
    );
    if (hasCancelledOrReturned) {
      return "Partially Completed";
    }
  }
  return this.orderStatus;
});
export default mongoose.model("Order", orderSchema);
