import * as cartService from "../services/cart.service.js";
import * as couponService from "../../shared/services/coupon.service.js";

export const getCart = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.redirect("/login?message=Please log in to access your cart");
    }

    const cart = await cartService.getOrCreateCart(req.session.userId, req.session);

    // Read out-of-stock items from session (survives redirects & reloads)
    // then immediately clear so it only shows once
    const outOfStockItems = req.session.outOfStockItems || cart.outOfStockItems || [];
    req.session.outOfStockItems = null;

    res.render("user/cart", {
      cart,
      currentPage_name: "cart",
      user: req.session.user || null,
      error: req.query.error || null,
      outOfStockItems,
    });
  } catch (error) {
    return res.redirect("/cart?error=" + encodeURIComponent("An error occurred while loading your cart. Please try again later."));
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product information is missing. Please try again.",
      });
    }

    const qty = Number(quantity);

    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid quantity (minimum 1).",
      });
    }

    const cart = await cartService.addToCart(
      req.session.userId,
      productId,
      qty,
    );

    res.json({
      success: true,
      message: "Item added to cart successfully",
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    let userMessage = error.message;
    
    if (error.message.includes("not found") || error.message.includes("not available")) {
      userMessage = "This product is no longer available. It may have been removed or is out of stock.";
    } else if (error.message.includes("out of stock")) {
      userMessage = "Sorry, this product is currently out of stock.";
    } else if (error.message.includes("Insufficient stock")) {
      userMessage = error.message;
    } else if (error.message.includes("Maximum")) {
      userMessage = error.message;
    } else if (error.message.includes("own submitted product")) {
      userMessage = "You cannot purchase your own listed products.";
    } else if (error.message.includes("category")) {
      userMessage = "This product is unavailable because its category has been disabled.";
    }

    res.status(400).json({
      success: false,
      message: userMessage,
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid quantity.",
      });
    }

    const cart = await cartService.updateCartItem(
      req.session.userId,
      productId,
      parseInt(quantity),
    );

    res.json({
      success: true,
      message: "Cart updated successfully",
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    let userMessage = error.message;
    
    if (error.message.includes("not found")) {
      userMessage = "Product not found in your cart.";
    } else if (error.message.includes("out of stock")) {
      userMessage = "This product is currently out of stock.";
    } else if (error.message.includes("Insufficient stock")) {
      userMessage = error.message;
    } else if (error.message.includes("Maximum")) {
      userMessage = error.message;
    }

    res.status(400).json({
      success: false,
      message: userMessage,
    });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await cartService.removeFromCart(
      req.session.userId,
      productId,
    );

    res.json({
      success: true,
      message: "Item removed from cart successfully",
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message.includes("not found") 
        ? "Item not found in your cart." 
        : "Failed to remove item from cart. Please try again.",
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    await cartService.clearCart(req.session.userId);

    res.json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCartCount = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({
        success: true,
        count: 0,
      });
    }

    const count = await cartService.getCartItemCount(req.session.userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get cart count",
    });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.session.userId;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a coupon code.",
      });
    }

    const cart = await cartService.getOrCreateCart(userId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty. Add items before applying a coupon.",
      });
    }

    const coupon = await couponService.validateCoupon(
      code.trim().toUpperCase(),
      userId,
      cart.totalAmount,
      cart.items,
    );

    const discount = couponService.calculateDiscount(coupon, cart.totalAmount);

    req.session.appliedCoupon = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount: discount,
      couponId: coupon._id,
    };

    res.json({
      success: true,
      message: `Coupon "${coupon.code}" applied successfully! You saved ₹${discount.toFixed(2)}`,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: discount,
      },
    });
  } catch (error) {
    let userMessage = error.message;
    
    if (error.message.includes("not found")) {
      userMessage = "Invalid coupon code. Please check and try again.";
    } else if (error.message.includes("expired")) {
      userMessage = "This coupon has expired and is no longer valid.";
    } else if (error.message.includes("minimum")) {
      userMessage = error.message;
    } else if (error.message.includes("already used")) {
      userMessage = "You have already used this coupon.";
    } else if (error.message.includes("usage limit")) {
      userMessage = "This coupon has reached its usage limit.";
    }

    res.status(400).json({
      success: false,
      message: userMessage,
    });
  }
};

export const removeCoupon = async (req, res) => {
  try {
    req.session.appliedCoupon = null;

    res.json({
      success: true,
      message: "Coupon removed successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const checkStock = async (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }

    const cart = await cartService.getOrCreateCart(req.session.userId, req.session);
    
    // Check if any items were removed due to stock issues
    const currentProductIds = cart.items.map(item => item.product._id.toString());
    const removedItems = productIds.filter(id => !currentProductIds.includes(id));
    
    // Check if there are out-of-stock items (now also stored in session)
    const hasChanges = removedItems.length > 0 || (cart.outOfStockItems && cart.outOfStockItems.length > 0);

    res.json({
      success: true,
      hasChanges,
      removedCount: removedItems.length,
      outOfStockItems: cart.outOfStockItems || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check stock",
    });
  }
};
