import Cart from "../../shared/models/Cart.js";
import Product from "../../shared/models/Product.js";
import { debounceAsync } from "../../shared/utils/asyncThrottle.js";
import * as wishlistService from "../../shared/services/wishlist.service.js";

export const getOrCreateCart = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    let cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
        path: 'items.product',
        select: 'title author price images stock condition isListed isDeleted',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    } else {
      // Filter out items that are deleted, unlisted, or out of stock
      let needsUpdate = false;
      const validItems = cart.items.filter(item => {
        if (!item.product || item.product.isDeleted || !item.product.isListed) {
          needsUpdate = true;
          return false;
        }
        
        // Update quantity if it exceeds available stock
        if (item.product.stock === 0) {
          needsUpdate = true;
          return false;
        }
        
        if (item.quantity > item.product.stock) {
          item.quantity = item.product.stock;
          needsUpdate = true;
        }
        
        return true;
      });

      if (needsUpdate) {
        cart.items = validItems;
        await cart.save();
        
        // Reload cart with updated items
        cart = await Cart.findById(cart._id).populate({
          path: 'items.product',
          select: 'title author price images stock condition isListed isDeleted',
          populate: {
            path: 'category',
            select: 'name'
          }
        });
      }
    }

    return cart;
  } catch (error) {
    throw error;
  }
};

export const addToCart = async (userId, productId, quantity = 1) => {
  const product = await Product.findOne({ 
    _id: productId, 
    isDeleted: false, 
    isListed: true 
  });

  if (!product) {
    throw new Error("Product not found or not available");
  }

  if (product.stock === 0) {
    throw new Error("Product is out of stock");
  }

  if (product.stock < quantity) {
    throw new Error("Insufficient stock available");
  }

  let cart = await getOrCreateCart(userId);

  const existingItemIndex = cart.items.findIndex(
    item => item.product._id.toString() === productId
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (newQuantity > product.stock) {
      throw new Error("Cannot add more items than available stock");
    }

    if (newQuantity > product.maxQuantityPerOrder) {
      throw new Error(`Maximum ${product.maxQuantityPerOrder} items allowed per order`);
    }
    
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    if (quantity > product.maxQuantityPerOrder) {
      throw new Error(`Maximum ${product.maxQuantityPerOrder} items allowed per order`);
    }

    cart.items.push({
      product: productId,
      quantity,
      price: product.price,
    });
  }

  await cart.save();

  try {
    await wishlistService.removeFromWishlist(userId, productId);
  } catch (error) {
  }
  
  return await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'title author price images stock condition isListed isDeleted maxQuantityPerOrder',
    populate: {
      path: 'category',
      select: 'name'
    }
  });
};

export const updateCartItem = async (userId, productId, quantity) => {
  const operationKey = `cart-update-${userId}-${productId}`;
  
  return debounceAsync(operationKey, async () => {
    if (quantity < 1) {
      return await removeFromCart(userId, productId);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (product.stock === 0) {
      throw new Error("Product is out of stock");
    }

    if (product.stock < quantity) {
      throw new Error("Insufficient stock available");
    }

    if (quantity > product.maxQuantityPerOrder) {
      throw new Error(`Maximum ${product.maxQuantityPerOrder} items allowed per order`);
    }

    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) {
      throw new Error("Cart not found");
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      throw new Error("Item not found in cart");
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'title author price images stock condition isListed isDeleted maxQuantityPerOrder',
      populate: {
        path: 'category',
        select: 'name'
      }
    });
  }, 300);
};

export const removeFromCart = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId, isActive: true });
  if (!cart) {
    throw new Error("Cart not found");
  }

  cart.items = cart.items.filter(
    item => item.product.toString() !== productId
  );

  await cart.save();

  return await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'title author price images stock condition isListed isDeleted',
    populate: {
      path: 'category',
      select: 'name'
    }
  });
};

export const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId, isActive: true });
  if (!cart) {
    throw new Error("Cart not found");
  }

  cart.items = [];
  await cart.save();

  return cart;
};

export const getCartItemCount = async (userId) => {
  const cart = await Cart.findOne({ user: userId, isActive: true });
  return cart ? cart.totalItems : 0;
};