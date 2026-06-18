import mongoose from "mongoose";
const sellerSubmissionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    condition: {
      type: String,
      required: true,
      enum: ["new", "like-new", "good", "fair", "poor"],
    },
    isbn: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    publisher: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    publishedYear: {
      type: Number,
      min: 1000,
      max: new Date().getFullYear() + 1,
    },
    language: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "English",
    },
    pages: {
      type: Number,
      min: 1,
    },
    images: [{
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
      }
    }],
    videos: [{
      url: {
        type: String,
      },
      publicId: {
        type: String,
      },
      duration: {
        type: Number,
      },
      size: {
        type: Number,
      }
    }],
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "needs-revision"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    approvedProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
  },
  {
    timestamps: true,
  }
);
sellerSubmissionSchema.index({ submittedBy: 1 });
sellerSubmissionSchema.index({ status: 1 });
sellerSubmissionSchema.index({ category: 1, subcategory: 1 });
sellerSubmissionSchema.index({ createdAt: -1 });
export default mongoose.model("SellerSubmission", sellerSubmissionSchema);