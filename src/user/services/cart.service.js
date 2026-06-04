import Cart from "../../shared/models/Cart.js";
import Product from "../../shared/models/Product.js";
import * as wishlistService from "../../shared/services/wishlist.service.js";

export const getOrCreateCart = async (userId, session = null) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    let cart = await Cart.findOne({ user: userId, isActive: true }).populate({
      path: "items.product",
      select:
        "title author price images stock condition isListed isDeleted seller hideFromSeller maxQuantityPerOrder",
      populate: {
        path: "category",
        select: "name isListed",
        match: { isListed: true, isDeleted: false },
      },
    });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    } else {
      let needsUpdate = false;
      const outOfStockItems = [];
      const stockAdjustedItems = [];
      const validItems = cart.items.filter((item) => {
        if (
          !item.product ||
          !item.product.category ||
          item.product.isDeleted ||
          !item.product.isListed
        ) {
          needsUpdate = true;
          return false;
        }

        if (
          item.product.hideFromSeller &&
          item.product.seller &&
          item.product.seller.toString() === userId.toString()
        ) {
          needsUpdate = true;
          return false;
        }

        if (item.product.stock === 0) {
          outOfStockItems.push({
            title: item.product.title,
            author: item.product.author,
            quantity: item.quantity,
          });
          return true;
        }

        if (item.quantity > item.product.stock) {
          stockAdjustedItems.push({
            title: item.product.title,
            originalQuantity: item.quantity,
            newQuantity: item.product.stock,
          });
          item.quantity = item.product.stock;
          needsUpdate = true;
        }

        return true;
      });

      if (needsUpdate) {
        cart.items = validItems;
        await cart.save();

        cart = await Cart.findById(cart._id).populate({
          path: "items.product",
          select:
            "title author price images stock condition isListed isDeleted seller hideFromSeller maxQuantityPerOrder",
          populate: {
            path: "category",
            select: "name isListed",
            match: { isListed: true, isDeleted: false },
          },
        });

        if (outOfStockItems.length > 0) {
          if (session) {
            const existing = session.outOfStockItems || [];
            session.outOfStockItems = [...existing, ...outOfStockItems];
          }
          cart.outOfStockItems = outOfStockItems;
        }
        
        if (stockAdjustedItems.length > 0) {
          if (session) {
            const existing = session.stockAdjustedItems || [];
            session.stockAdjustedItems = [...existing, ...stockAdjustedItems];
          }
          cart.stockAdjustedItems = stockAdjustedItems;
        }
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
    isListed: true,
  })
    .select("stock maxQuantityPerOrder price seller hideFromSeller category")
    .populate({
      path: "category",
      select: "isListed",
      match: { isListed: true, isDeleted: false },
    })
    .lean();

  if (!product) {
    throw new Error("Product not found or not available");
  }

  if (!product.category) {
    throw new Error(
      "This product is unavailable because its category has been disabled",
    );
  }

  if (
    product.hideFromSeller &&
    product.seller &&
    product.seller.toString() === userId.toString()
  ) {
    throw new Error("You cannot add your own submitted product to cart");
  }

  if (product.stock === 0) {
    throw new Error("Product is out of stock");
  }

  if (product.stock < quantity) {
    throw new Error(`Only ${product.stock} item(s) available in stock`);
  }

  let cart = await Cart.findOne({ user: userId, isActive: true });

  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId,
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    if (newQuantity > product.stock) {
      throw new Error(
        `Cannot add more items. Only ${product.stock} available in stock`,
      );
    }

    if (newQuantity > product.maxQuantityPerOrder) {
      throw new Error(
        `Maximum ${product.maxQuantityPerOrder} items allowed per order for this product`,
      );
    }

    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    if (quantity > product.maxQuantityPerOrder) {
      throw new Error(
        `Maximum ${product.maxQuantityPerOrder} items allowed per order for this product`,
      );
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
  } catch (error) {}

  return cart;
};

export const updateCartItem = async (userId, productId, quantity) => {
  if (quantity < 1) {
    return await removeFromCart(userId, productId);
  }

  const product = await Product.findById(productId)
    .select("stock maxQuantityPerOrder isListed isDeleted category")
    .populate({
      path: "category",
      select: "isListed",
      match: { isListed: true, isDeleted: false },
    });

  if (!product || product.isDeleted || !product.isListed) {
    throw new Error("Product not found or no longer available");
  }

  if (!product.category) {
    throw new Error(
      "This product is unavailable because its category has been disabled",
    );
  }

  if (product.stock > 0 && product.stock < quantity) {
    throw new Error(`Only ${product.stock} item(s) available in stock`);
  }

  if (quantity > product.maxQuantityPerOrder) {
    throw new Error(
      `Maximum ${product.maxQuantityPerOrder} items allowed per order for this product`,
    );
  }

  const cart = await Cart.findOne({ user: userId, isActive: true });
  if (!cart) {
    throw new Error("Cart not found");
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId,
  );

  if (itemIndex === -1) {
    throw new Error("Item not found in cart");
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  return await Cart.findById(cart._id).populate({
    path: "items.product",
    select:
      "title author price images stock condition isListed isDeleted maxQuantityPerOrder seller hideFromSeller",
    populate: {
      path: "category",
      select: "name isListed",
      match: { isListed: true, isDeleted: false },
    },
  });
};

export const removeFromCart = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId, isActive: true });
  if (!cart) {
    throw new Error("Cart not found");
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId,
  );

  await cart.save();

  return await Cart.findById(cart._id).populate({
    path: "items.product",
    select:
      "title author price images stock condition isListed isDeleted seller hideFromSeller maxQuantityPerOrder",
    populate: {
      path: "category",
      select: "name isListed",
      match: { isListed: true, isDeleted: false },
    },
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
