import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
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
    brand: {
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
        default: null,
      }
    }],
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    maxQuantityPerOrder: {
      type: Number,
      min: 1,
      default: 10,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
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

productSchema.index({ title: "text", author: "text", description: "text" });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ isListed: 1, isDeleted: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model("Product", productSchema);