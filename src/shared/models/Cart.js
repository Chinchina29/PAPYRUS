import mongoose from "mongoose";
import Product from "./Product.js";
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
});
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalItems: {
    type: Number,
    default: 0,
    min: 0,
  },
  activeItemsCount: {
    type: Number,
    default: 0,
  },
  blockedItemsCount: {
    type: Number,
    default: 0,
  },
  calculatedSubtotal: {
    type: Number,
    default: 0,
  },
  calculatedShipping: {
    type: Number,
    default: 0,
  },
  appliedDiscount: {
    type: Number,
    default: 0,
  },
  finalTotal: {
    type: Number,
    default: 0,
  },
  lastCalculatedAt: {
    type: Date,
    default: Date.now,
  },
  calculationVersion: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});
cartSchema.pre('save', async function() {
  const productIds = this.items.map(item => item.product._id ? item.product._id : item.product);
  const products = await Product.find({ _id: { $in: productIds } })
    .populate('category');
  const productMap = new Map(products.map(p => [p._id.toString(), p]));
  let totalItems = 0;
  let totalAmount = 0;
  let activeItemsCount = 0;
  let blockedItemsCount = 0;
  let calculatedSubtotal = 0;
  this.items.forEach(item => {
    const productId = item.product._id ? item.product._id.toString() : item.product.toString();
    const product = productMap.get(productId);
    const isBlocked = !product || 
                      product.isDeleted || 
                      !product.isListed || 
                      !product.category || 
                      !product.category.isListed || 
                      product.category.isDeleted ||
                      (product.hideFromSeller && product.seller && product.seller.toString() === this.user.toString());
    if (!isBlocked) {
      totalItems += item.quantity;
      totalAmount += item.price * item.quantity;
      calculatedSubtotal += item.price * item.quantity;
      activeItemsCount += 1;
    } else {
      blockedItemsCount += 1;
    }
  });
  this.totalItems = totalItems;
  this.totalAmount = totalAmount;
  this.activeItemsCount = activeItemsCount;
  this.blockedItemsCount = blockedItemsCount;
  this.calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
  this.calculatedShipping = calculatedSubtotal >= 500 ? 0 : 50;
  this.finalTotal = Math.round((this.calculatedSubtotal + this.calculatedShipping - this.appliedDiscount) * 100) / 100;
  this.lastCalculatedAt = new Date();
  this.calculationVersion += 1;
});
cartSchema.index({ user: 1, isActive: 1 });
cartSchema.index({ "items.product": 1 });
export default mongoose.model("Cart", cartSchema);
