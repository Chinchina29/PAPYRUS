import * as cartService from "../services/cart.service.js";
import * as addressService from "../services/address.service.js";
import * as orderService from "../../shared/services/order.service.js";
import * as couponService from "../../shared/services/coupon.service.js";
import Product from "../../shared/models/Product.js";
import Coupon from "../../shared/models/Coupon.js";
export const getCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;
    const cart = await cartService.getOrCreateCart(userId);
    console.log('Checkout - Cart structure:', JSON.stringify(cart.items.slice(0, 1), null, 2)); // Log first item structure
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
    const stockIssues = [];
    let hasStockChanges = false;
    const originalCart = await cartService.getOrCreateCart(userId, req.session);
    if (
      originalCart.outOfStockItems &&
      originalCart.outOfStockItems.length > 0
    ) {
      originalCart.outOfStockItems.forEach((item) => {
        stockIssues.push(
          `"${item.title}" was removed from your cart (out of stock)`,
        );
        hasStockChanges = true;
      });
    }
    if (
      originalCart.stockAdjustedItems &&
      originalCart.stockAdjustedItems.length > 0
    ) {
      originalCart.stockAdjustedItems.forEach((item) => {
        stockIssues.push(
          `"${item.title}" quantity reduced from ${item.originalQuantity} to ${item.newQuantity} (limited stock)`,
        );
        hasStockChanges = true;
      });
    }
    if (
      req.session.stockAdjustedItems &&
      req.session.stockAdjustedItems.length > 0
    ) {
      req.session.stockAdjustedItems.forEach((item) => {
        stockIssues.push(
          `"${item.title}" quantity was reduced from ${item.originalQuantity} to ${item.newQuantity} (limited stock)`,
        );
        hasStockChanges = true;
      });
      delete req.session.stockAdjustedItems;
    }
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
        .select("stock isListed isDeleted title category")
        .populate({
          path: "category",
          select: "isListed isDeleted",
          match: { isListed: true, isDeleted: false },
        });
      if (
        !product ||
        product.isDeleted ||
        !product.isListed ||
        !product.category
      ) {
        stockIssues.push(`"${item.product.title}" is no longer available`);
        hasStockChanges = true;
      } else if (product.stock > 0 && product.stock < item.quantity) {
        // Only block if user wants more than available
        stockIssues.push(
          `"${item.product.title}" — only ${product.stock} left (you have ${item.quantity} in cart)`,
        );
        hasStockChanges = true;
      }
      // Remove the low stock warning that was blocking checkout
    }
    if (hasStockChanges) {
      req.session.stockIssues = stockIssues;
    } else if (req.session.stockIssues) {
      delete req.session.stockIssues;
    }
    const addresses = await addressService.getUserAddresses(userId);
    const defaultAddress =
      addresses.find((addr) => addr.isDefault) || addresses[0];
    const subtotal = cart.totalAmount;
    const shippingCharge = subtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const totalAmount = parseFloat(
      (subtotal + shippingCharge - discount).toFixed(2),
    );
    const now = new Date();
    const availableCoupons = await couponService.getAvailableCoupons(
      userId,
      subtotal,
      cart.items
    );
    console.log('Checkout - Available coupons:', availableCoupons.length);
    console.log('Checkout - Cart total:', subtotal);
    console.log('Checkout - Cart items count:', cart.items.length);
    console.log('Rendering checkout with coupons:', availableCoupons.length);
    availableCoupons.forEach((coupon, index) => {
      console.log(`Coupon ${index + 1}: ${coupon.code} - ${coupon.discountType} ${coupon.discountValue}`);
    });
    res.render("user/checkout", {
      cart,
      addresses,
      defaultAddress,
      subtotal,
      shippingCharge,
      discount,
      totalAmount,
      appliedCoupon: req.session.appliedCoupon || null,
      availableCoupons: availableCoupons || [],
      stockIssues,
      currentPage_name: "checkout",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect("/cart?error=An error occurred while loading checkout");
  }
};
export const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { addressId, paymentMethod, orderNotes } = req.body;
    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Please select a delivery address.",
      });
    }
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please select a payment method.",
      });
    }
    const cart = await cartService.getOrCreateCart(userId);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Your cart is empty. Please add items before placing an order.",
      });
    }
    const availableItems = [];
    const outOfStockItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
        .select("stock isListed isDeleted category title")
        .populate({
          path: "category",
          select: "isListed",
          match: { isListed: true, isDeleted: false },
        });
      if (
        !product ||
        product.isDeleted ||
        !product.isListed ||
        !product.category
      ) {
        return res.status(400).json({
          success: false,
          message: `Sorry, "${item.product.title}" is no longer available for purchase. Please remove it from your cart and try again.`,
        });
      }
      if (product.stock === 0) {
        outOfStockItems.push({
          ...item.toObject(),
          status: "Out of Stock",
          actualQuantity: 0,
        });
      } else if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.product.title}". Only ${product.stock} ${product.stock === 1 ? "copy" : "copies"} available, but you have ${item.quantity} in your cart. Please update the quantity.`,
        });
      } else {
        availableItems.push({
          ...item.toObject(),
          status: "Available",
          actualQuantity: item.quantity,
        });
      }
    }
    const address = await addressService.getAddressById(addressId, userId);
    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Selected address not found. Please choose a valid address.",
      });
    }
    const availableSubtotal = availableItems.reduce(
      (total, item) => total + item.price * item.actualQuantity,
      0,
    );
    const shippingCharge = availableSubtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const totalAmount = parseFloat(
      (availableSubtotal + shippingCharge - discount).toFixed(2),
    );
    const orderItems = [...availableItems, ...outOfStockItems].map((item) => ({
      product: item.product._id,
      title: item.product.title,
      price: parseFloat(item.price.toFixed(2)),
      quantity: item.quantity,
      actualQuantity: item.actualQuantity,
      subtotal: parseFloat((item.price * item.actualQuantity).toFixed(2)),
      status: item.status,
    }));
    const orderData = {
      user: userId,
      items: orderItems,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.postalCode,
        country: address.country,
      },
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
      orderStatus: "Pending",
      subtotal: parseFloat(availableSubtotal.toFixed(2)),
      shippingCharge: parseFloat(shippingCharge.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      couponCode: req.session.appliedCoupon?.code || null,
      totalAmount,
      orderNotes: orderNotes || "",
    };
    const order = await orderService.createOrder(orderData);
    for (const item of availableItems) {
      const updateResult = await Product.findOneAndUpdate(
        {
          _id: item.product._id,
          stock: { $gte: item.actualQuantity },
        },
        {
          $inc: { stock: -item.actualQuantity },
        },
        { new: true },
      );
      if (!updateResult) {
        await orderService.cancelOrder(
          order._id,
          "Stock unavailable during order processing",
        );
        const currentProduct = await Product.findById(item.product._id).select(
          "stock title",
        );
        if (!currentProduct || currentProduct.stock === 0) {
          return res.status(400).json({
            success: false,
            message: `Sorry, "${item.product.title}" just went out of stock. Your order has been cancelled. Please refresh your cart and try again.`,
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `Sorry, only ${currentProduct.stock} ${currentProduct.stock === 1 ? "copy" : "copies"} of "${item.product.title}" ${currentProduct.stock === 1 ? "is" : "are"} now available. Your order has been cancelled. Please update your cart quantity and try again.`,
          });
        }
      }
    }
    await cartService.clearCart(userId);
    req.session.appliedCoupon = null;
    res.json({
      success: true,
      message: "Order placed successfully!",
      orderId: order._id,
      orderNumber: order.orderId,
    });
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to place order. Please try again later.",
    });
  }
};
export const validateOrderCoupon = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    if (order.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }
    if (!order.couponCode || order.discount <= 0) {
      return res.json({
        success: true,
        isValid: true,
        discount: 0,
        message: "No coupon applied",
      });
    }
    // Calculate active subtotal (excluding cancelled/returned items)
    const activeItems = order.items.filter(item => 
      item.status !== 'Cancelled' && item.status !== 'Returned'
    );
    const activeSubtotal = activeItems.reduce((total, item) => {
      return total + (item.price * item.actualQuantity);
    }, 0);
    try {
      const coupon = await couponService.validateCouponForActiveItems(
        order.couponCode,
        userId,
        activeSubtotal,
        activeItems
      );
      const validDiscount = couponService.calculateDiscount(coupon, activeSubtotal);
      return res.json({
        success: true,
        isValid: true,
        discount: validDiscount,
        activeSubtotal,
        minPurchaseAmount: coupon.minPurchaseAmount,
        message: "Coupon is valid for active items",
      });
    } catch (error) {
      return res.json({
        success: true,
        isValid: false,
        discount: 0,
        activeSubtotal,
        message: error.message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate coupon",
    });
  }
};
export const getOrderSuccess = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.redirect("/orders?error=Order not found");
    }
    if (order.user._id.toString() !== userId.toString()) {
      return res.redirect(
        "/orders?error=You do not have permission to view this order",
      );
    }
    res.render("user/order-success", {
      order,
      currentPage_name: "orders",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect("/orders?error=An error occurred while loading order details");
  }
};