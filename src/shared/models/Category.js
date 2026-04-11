import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isSubcategory: {
      type: Boolean,
      default: false,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subcategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    }],
    isListed: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ name: 1, parentCategory: 1 }, { unique: false });
categorySchema.index({ isSubcategory: 1 });
categorySchema.index({ isListed: 1, isDeleted: 1 });
categorySchema.index({ parentCategory: 1 });

categorySchema.statics.getMainCategories = function() {
  return this.find({ isSubcategory: false, isDeleted: false, isListed: true }).sort({ sortOrder: 1, name: 1 });
};

categorySchema.statics.getSubcategories = function(parentId) {
  return this.find({ parentCategory: parentId, isSubcategory: true, isDeleted: false, isListed: true }).sort({ sortOrder: 1, name: 1 });
};

export default mongoose.model("Category", categorySchema);