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
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

cartSchema.pre('save', async function() {
  const productIds = this.items.map(item => item.product);
  const products = await Product.find({ _id: { $in: productIds } })
    .populate('category');
  
  const productMap = new Map(products.map(p => [p._id.toString(), p]));
  
  let totalItems = 0;
  let totalAmount = 0;
  
  this.items.forEach(item => {
    const product = productMap.get(item.product.toString());
    
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
    }
  });
  
  this.totalItems = totalItems;
  this.totalAmount = totalAmount;
});

cartSchema.index({ user: 1, isActive: 1 });
cartSchema.index({ "items.product": 1 });

export default mongoose.model("Cart", cartSchema);