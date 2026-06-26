import MESSAGES from "../constants/messages.js";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
export const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId })
    .populate({
      path: "items.product",
      match: { isDeleted: false, isListed: true },
      populate: { path: "category", select: "name" },
    });
  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, items: [] });
    await wishlist.save();
  }
  wishlist.items = wishlist.items.filter(item => item.product !== null);
  return wishlist;
};
export const addToWishlist = async (userId, productId) => {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isListed: true,
  }).select('_id').lean();
  if (!product) {
    throw new Error(MESSAGES.CUSTOM.PRODUCT_NOT_FOUND_OR_UNAVAILABLE);
  }
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, items: [] });
  }
  const existingItem = wishlist.items.find(
    (item) => item.product.toString() === productId
  );
  if (existingItem) {
    throw new Error(MESSAGES.CUSTOM.PRODUCT_ALREADY_IN_WISHLIST);
  }
  wishlist.items.push({ product: productId });
  await wishlist.save();
  return wishlist;
};
export const removeFromWishlist = async (userId, productId) => {
  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    throw new Error(MESSAGES.CUSTOM.WISHLIST_NOT_FOUND);
  }
  wishlist.items = wishlist.items.filter(
    (item) => item.product.toString() !== productId
  );
  await wishlist.save();
  return wishlist;
};
export const clearWishlist = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    throw new Error(MESSAGES.CUSTOM.WISHLIST_NOT_FOUND);
  }
  wishlist.items = [];
  await wishlist.save();
  return wishlist;
};
export const isInWishlist = async (userId, productId) => {
  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    return false;
  }
  return wishlist.items.some(
    (item) => item.product.toString() === productId
  );
};
export const getWishlistItemCount = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId })
    .populate({
      path: "items.product",
      match: { isDeleted: false, isListed: true },
      select: "_id"
    });
  if (!wishlist) {
    return 0;
  }
  const validItems = wishlist.items.filter(item => item.product !== null);
  return validItems.length;
};
export const moveToCart = async (userId, productId) => {
  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    throw new Error(MESSAGES.CUSTOM.WISHLIST_NOT_FOUND);
  }
  const itemIndex = wishlist.items.findIndex(
    (item) => item.product.toString() === productId
  );
  if (itemIndex === -1) {
    throw new Error(MESSAGES.CUSTOM.PRODUCT_NOT_IN_WISHLIST);
  }
  wishlist.items.splice(itemIndex, 1);
  await wishlist.save();
  return wishlist;
};