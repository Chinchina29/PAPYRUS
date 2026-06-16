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
      const outOfStockItems = [];
      const stockAdjustedItems = [];

      cart.items.forEach((item) => {
        // 1. Mock product if it's null (physically deleted from DB)
        if (!item.product) {
          item.product = {
            _id: item._id, // fallback
            title: "Unavailable Product",
            author: "Unknown Author",
            images: [],
            stock: 0,
            isDeleted: true,
            isListed: false,
            category: null
          };
        }

        // 2. Check if item is blocked
        const isProductDeletedOrUnlisted = item.product.isDeleted || !item.product.isListed;
        const isCategoryUnavailable = !item.product.category || !item.product.category.isListed || item.product.category.isDeleted;
        const isOwnProduct = item.product.hideFromSeller && item.product.seller && item.product.seller.toString() === userId.toString();
        
        const isBlocked = isProductDeletedOrUnlisted || isCategoryUnavailable || isOwnProduct;

        if (isBlocked) {
          item.isBlocked = true;
          return;
        }

        // 3. Check if out of stock
        if (item.product.stock === 0) {
          outOfStockItems.push({
            title: item.product.title,
            author: item.product.author,
            quantity: item.quantity,
          });
          return;
        }

        // 4. Check if quantity exceeds stock
        if (item.quantity > item.product.stock) {
          stockAdjustedItems.push({
            title: item.product.title,
            originalQuantity: item.quantity,
            newQuantity: item.product.stock,
          });
          item.hasInsufficientStock = true;
          item.availableStock = item.product.stock;
        }
      });

      // Synchronize totals in DB if needed (e.g. if a product was unlisted or deleted recently)
      let calculatedItems = 0;
      let calculatedAmount = 0;
      
      cart.items.forEach(item => {
        if (!item.isBlocked) {
          calculatedItems += item.quantity;
          calculatedAmount += item.price * item.quantity;
        }
      });
      
      if (cart.totalItems !== calculatedItems || cart.totalAmount !== calculatedAmount) {
        cart.totalItems = calculatedItems;
        cart.totalAmount = calculatedAmount;
        await cart.save();
      }

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
