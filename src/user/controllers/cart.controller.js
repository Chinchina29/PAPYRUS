import * as cartService from "../services/cart.service.js";
import * as couponService from "../../shared/services/coupon.service.js";

export const getCart = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.redirect("/login?message=Please log in to access your cart");
    }

    const cart = await cartService.getOrCreateCart(
      req.session.userId,
      req.session,
    );

    const outOfStockItems =
      req.session.outOfStockItems || cart.outOfStockItems || [];
    const stockAdjustedItems =
      req.session.stockAdjustedItems || cart.stockAdjustedItems || [];

    req.session.outOfStockItems = null;
    req.session.stockAdjustedItems = null;

    res.render("user/cart", {
      cart,
      currentPage_name: "cart",
      user: req.session.user || null,
      error: req.query.error || null,
      outOfStockItems,
      stockAdjustedItems,
    });
  } catch (error) {
    return res.redirect(
      "/cart?error=" +
        encodeURIComponent(
          "An error occurred while loading your cart. Please try again later.",
        ),
    );
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product selection is required. Please choose a product to add to cart.",
        field: "productId",
        errorType: "MISSING_PRODUCT_ID"
      });
    }

    if (!quantity) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required. Please specify how many items you want to add.",
        field: "quantity",
        errorType: "MISSING_QUANTITY"
      });
    }

    const qty = Number(quantity);

    if (isNaN(qty)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid number. Please enter a numeric value.",
        field: "quantity",
        errorType: "INVALID_QUANTITY_FORMAT"
      });
    }

    if (qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1. Please enter a positive number.",
        field: "quantity",
        errorType: "INVALID_QUANTITY_MINIMUM"
      });
    }

    if (!Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a whole number. Decimal quantities are not allowed.",
        field: "quantity",
        errorType: "INVALID_QUANTITY_DECIMAL"
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
    let errorType = "GENERIC_ERROR";
    let field = null;

    if (
      error.message.includes("not found") ||
      error.message.includes("not available")
    ) {
      userMessage = "This product is no longer available. It may have been removed or is out of stock.";
      errorType = "PRODUCT_NOT_AVAILABLE";
      field = "productId";
    } else if (error.message.includes("out of stock")) {
      userMessage = "Sorry, this product is currently out of stock.";
      errorType = "OUT_OF_STOCK";
      field = "productId";
    } else if (error.message.includes("Insufficient stock")) {
      userMessage = error.message + " Please reduce the quantity or check availability.";
      errorType = "INSUFFICIENT_STOCK";
      field = "quantity";
    } else if (error.message.includes("Maximum")) {
      userMessage = error.message + " Please reduce the quantity.";
      errorType = "MAXIMUM_QUANTITY_EXCEEDED";
      field = "quantity";
    } else if (error.message.includes("own submitted product")) {
      userMessage = "You cannot purchase your own listed products.";
      errorType = "OWN_PRODUCT";
      field = "productId";
    } else if (error.message.includes("category")) {
      userMessage = "This product is unavailable because its category has been disabled.";
      errorType = "CATEGORY_DISABLED";
      field = "productId";
    }

    res.status(400).json({
      success: false,
      message: userMessage,
      field,
      errorType
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required to update cart item.",
        field: "productId",
        errorType: "MISSING_PRODUCT_ID"
      });
    }

    if (!quantity && quantity !== 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity field is required. Please specify the quantity.",
        field: "quantity",
        errorType: "MISSING_QUANTITY"
      });
    }

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative. Please enter a valid positive number.",
        field: "quantity",
        errorType: "INVALID_QUANTITY_NEGATIVE"
      });
    }

    if (!Number.isInteger(Number(quantity))) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a whole number. Decimal quantities are not allowed.",
        field: "quantity",
        errorType: "INVALID_QUANTITY_DECIMAL"
      });
    }

    const cart = await cartService.updateCartItem(
      req.session.userId,
      productId,
      parseInt(quantity),
    );

    const subtotal = cart.totalAmount;
    const shippingCharge = subtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const total = subtotal + shippingCharge - discount;

    res.json({
      success: true,
      message: "Cart updated successfully",
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        subtotal,
        shippingCharge,
        discount,
        total,
        items: cart.items.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
      },
    });
  } catch (error) {
    let userMessage = error.message;
    let errorType = "GENERIC_ERROR";
    let field = null;

    if (error.message.includes("not found")) {
      userMessage = "The product was not found in your cart. It may have been removed already.";
      errorType = "PRODUCT_NOT_FOUND";
      field = "productId";
    } else if (error.message.includes("out of stock")) {
      userMessage = "This product is currently out of stock and cannot be updated.";
      errorType = "OUT_OF_STOCK";
      field = "productId";
    } else if (error.message.includes("Insufficient stock")) {
      userMessage = error.message + " Please reduce the quantity.";
      errorType = "INSUFFICIENT_STOCK";
      field = "quantity";
    } else if (error.message.includes("Maximum")) {
      userMessage = error.message + " Please reduce the quantity.";
      errorType = "MAXIMUM_QUANTITY_EXCEEDED";
      field = "quantity";
    }

    res.status(400).json({
      success: false,
      message: userMessage,
      field,
      errorType
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

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required. Please enter a coupon code.",
        field: "code",
        errorType: "MISSING_COUPON_CODE"
      });
    }

    if (!code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code cannot be empty. Please enter a valid coupon code.",
        field: "code",
        errorType: "EMPTY_COUPON_CODE"
      });
    }

    if (code.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Coupon code must be at least 3 characters long.",
        field: "code",
        errorType: "COUPON_CODE_TOO_SHORT"
      });
    }

    const cart = await cartService.getOrCreateCart(userId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty. Add items before applying a coupon.",
        field: "cart",
        errorType: "EMPTY_CART"
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
    let errorType = "GENERIC_ERROR";
    let field = "code";

    if (error.message.includes("not found")) {
      userMessage = "Invalid coupon code. Please check the spelling and try again.";
      errorType = "INVALID_COUPON";
    } else if (error.message.includes("expired")) {
      userMessage = "This coupon has expired and is no longer valid.";
      errorType = "EXPIRED_COUPON";
    } else if (error.message.includes("minimum")) {
      userMessage = error.message + " Add more items to reach the minimum order value.";
      errorType = "MINIMUM_ORDER_NOT_MET";
      field = "cart";
    } else if (error.message.includes("already used")) {
      userMessage = "You have already used this coupon. Each coupon can only be used once per customer.";
      errorType = "COUPON_ALREADY_USED";
    } else if (error.message.includes("usage limit")) {
      userMessage = "This coupon has reached its usage limit and is no longer available.";
      errorType = "USAGE_LIMIT_REACHED";
    }

    res.status(400).json({
      success: false,
      message: userMessage,
      field,
      errorType
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

export const getCartSummary = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({
        success: true,
        cart: {
          totalItems: 0,
          totalAmount: 0,
          subtotal: 0,
          shippingCharge: 0,
          discount: 0,
          total: 0,
          items: [],
        },
      });
    }

    const cart = await cartService.getOrCreateCart(req.session.userId);
    const subtotal = cart.totalAmount;
    const shippingCharge = subtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const totalAmount = subtotal + shippingCharge - discount;

    res.json({
      success: true,
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        subtotal,
        shippingCharge,
        discount,
        total: totalAmount,
        items:
          cart.items?.map((item) => ({
            productId: item.product._id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
          })) || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get cart summary",
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

    const cart = await cartService.getOrCreateCart(
      req.session.userId,
      req.session,
    );

    const currentProductIds = cart.items.map((item) =>
      item.product._id.toString(),
    );
    const removedItems = productIds.filter(
      (id) => !currentProductIds.includes(id),
    );

    const hasChanges =
      removedItems.length > 0 ||
      (cart.outOfStockItems && cart.outOfStockItems.length > 0);

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
