import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as cartService from "../services/cart.service.js";
import * as addressService from "../services/address.service.js";
import * as orderService from "../../shared/services/order.service.js";
import * as couponService from "../../shared/services/coupon.service.js";
import * as paymentService from "../../shared/services/payment.service.js";
import { paymentConfig, COD_MAX_AMOUNT } from "../../shared/config/payment.config.js";
import Product from "../../shared/models/Product.js";
import User from "../../shared/models/User.js";
import WalletTransaction from "../../shared/models/WalletTransaction.js";
export const getCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;
    const cart = await cartService.getOrCreateCart(userId);
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
      if (!item.product) {
        stockIssues.push("An item in your cart is no longer available");
        hasStockChanges = true;
        continue;
      }
      const productId = item.product._id || item.product;
      const product = await Product.findById(productId)
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
        stockIssues.push(`"${item.product.title || "Item"}" is no longer available`);
        hasStockChanges = true;
      } else if (product.stock > 0 && product.stock < item.quantity) {
        stockIssues.push(
          `"${item.product.title || "Item"}" — only ${product.stock} left (you have ${item.quantity} in cart)`,
        );
        hasStockChanges = true;
      }
    }
    if (hasStockChanges) {
      req.session.stockIssues = stockIssues;
    } else if (req.session.stockIssues) {
      delete req.session.stockIssues;
    }
    const addresses = await addressService.getUserAddresses(userId);
    const defaultAddress =
      addresses.find((addr) => addr.isDefault) || addresses[0];
    const activeItems = cart.items.filter(item => !item.isBlocked);

    // Apply category offer to each item's effective price
    let subtotal = 0;
    let categoryOfferDiscount = 0;
    for (const item of activeItems) {
      const offer = item.product?.category?.categoryOffer || 0;
      const itemPrice = item.price || (item.product?.price) || 0;
      const itemQty = item.quantity || 1;
      const basePrice = itemPrice * itemQty;
      const offerAmount = offer > 0 ? parseFloat(((basePrice * offer) / 100).toFixed(2)) : 0;
      subtotal += basePrice - offerAmount;
      categoryOfferDiscount += offerAmount;
    }
    subtotal = Math.max(0, parseFloat(subtotal.toFixed(2)));
    categoryOfferDiscount = Math.max(0, parseFloat(categoryOfferDiscount.toFixed(2)));

    const shippingCharge = subtotal >= 500 ? 0 : subtotal > 0 ? 50 : 0;
    const couponDiscount = req.session.appliedCoupon?.discount || 0;
    const discount = couponDiscount;
    const totalAmount = Math.max(0, parseFloat(
      (subtotal + shippingCharge - discount).toFixed(2),
    ));
    const availableCoupons = await couponService.getAvailableCoupons(
      userId,
      subtotal,
      activeItems,
    );
    const codAllowed = totalAmount <= COD_MAX_AMOUNT;
    const currentUser = await User.findById(userId).select("-password -otp");
    res.render("user/checkout", {
      cart,
      addresses,
      defaultAddress,
      subtotal,
      shippingCharge,
      discount,
      categoryOfferDiscount,
      totalAmount,
      appliedCoupon: req.session.appliedCoupon || null,
      availableCoupons: availableCoupons || [],
      stockIssues,
      currentPage_name: "checkout",
      user: currentUser || req.session.user || null,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      codAllowed,
      codMaxAmount: COD_MAX_AMOUNT,
      paymentGateways: {
        razorpay: !!process.env.RAZORPAY_KEY_ID,
        cod: codAllowed,
      },
      paymentConfig
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_SELECT_A_DELIVERY_ADDRESS,
      });
    }
    if (!paymentMethod) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_SELECT_A_PAYMENT_METHOD,
      });
    }
    // Server-side COD amount restriction
    if (paymentMethod === 'COD') {
      const activeItemsForCOD = (await cartService.getOrCreateCart(userId)).items.filter(i => !i.isBlocked);
      const codSubtotal = activeItemsForCOD.reduce((t, i) => t + i.price * i.quantity, 0);
      const codShipping = codSubtotal >= 500 ? 0 : 50;
      const codDiscount = req.session.appliedCoupon?.discount || 0;
      const codTotal = parseFloat((codSubtotal + codShipping - codDiscount).toFixed(2));
      if (codTotal > COD_MAX_AMOUNT) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Cash on Delivery is not available for orders above ₹${COD_MAX_AMOUNT}. Please choose another payment method.`,
        });
      }
    }
    const cart = await cartService.getOrCreateCart(userId);
    if (!cart || cart.items.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.YOUR_CART_IS_EMPTY_PLEASE_ADD_ITEMS_BEFORE_PLACING_AN_ORDER,
      });
    }
    const availableItems = [];
    const outOfStockItems = [];
    for (const item of cart.items) {
      if (!item.product) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.PRODUCT_NOT_FOUND_OR_NO_LONGER_AVAILABLE,
        });
      }
      const productId = item.product._id || item.product;
      const product = await Product.findById(productId)
        .select("stock isListed isDeleted category title")
        .populate({
          path: "category",
          select: "isListed categoryOffer",
          match: { isListed: true, isDeleted: false },
        });
      if (
        !product ||
        product.isDeleted ||
        !product.isListed ||
        !product.category
      ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.PRODUCT_NOT_FOUND_OR_NO_LONGER_AVAILABLE,
        });
      }
      if (product.stock === 0) {
        outOfStockItems.push({
          ...item.toObject(),
          status: "Out of Stock",
          actualQuantity: 0,
        });
      } else if (product.stock < item.quantity) {
        const itemTitle = item.product?.title || product.title || "Book";
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Insufficient stock for "${itemTitle}". Only ${product.stock} ${product.stock === 1 ? "copy" : "copies"} available, but you have ${item.quantity} in your cart. Please update the quantity.`,
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.SELECTED_ADDRESS_NOT_FOUND_PLEASE_CHOOSE_A_VALID_ADDRESS,
      });
    }
    // Apply category offer discounts per item
    let availableSubtotal = 0;
    let categoryOfferDiscount = 0;
    for (const item of availableItems) {
      const productId = item.product._id || item.product;
      const product = await Product.findById(productId)
        .select("category")
        .populate({ path: "category", select: "categoryOffer" });
      const offer     = product?.category?.categoryOffer || 0;
      const basePrice = item.price * item.actualQuantity;
      const offerAmt  = offer > 0 ? parseFloat(((basePrice * offer) / 100).toFixed(2)) : 0;
      availableSubtotal    += basePrice - offerAmt;
      categoryOfferDiscount += offerAmt;
    }
    availableSubtotal     = parseFloat(availableSubtotal.toFixed(2));
    categoryOfferDiscount = parseFloat(categoryOfferDiscount.toFixed(2));
    const shippingCharge = availableSubtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const totalAmount = parseFloat(
      (availableSubtotal + shippingCharge - discount).toFixed(2),
    );
    const orderItems = [...availableItems, ...outOfStockItems].map((item) => ({
      product: item.product._id || item.product,
      title: item.product?.title || item.title || "Book",
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
      paymentStatus: "Pending",
      orderStatus: "Pending",
      subtotal: parseFloat(availableSubtotal.toFixed(2)),
      categoryOfferDiscount: categoryOfferDiscount,
      shippingCharge: parseFloat(shippingCharge.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      couponCode: req.session.appliedCoupon?.code || null,
      totalAmount,
      orderNotes: orderNotes || "",
    };
    const order = await orderService.createOrder(orderData);
    for (const item of availableItems) {
      const productId = item.product._id || item.product;
      const updateResult = await Product.findOneAndUpdate(
        {
          _id: productId,
          stock: { $gte: item.actualQuantity },
        },
        {
          $inc: { stock: -item.actualQuantity },
        },
        { returnDocument: 'after' },
      );
      if (!updateResult) {
        await orderService.cancelOrder(
          order._id,
          "Stock unavailable during order processing",
        );
        const currentProduct = await Product.findById(productId).select(
          "stock title",
        );
        const prodTitle = item.product?.title || currentProduct?.title || "Book";
        if (!currentProduct || currentProduct.stock === 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Sorry, "${prodTitle}" just went out of stock. Your order has been cancelled. Please refresh your cart and try again.`,
          });
        } else {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Sorry, only ${currentProduct.stock} ${currentProduct.stock === 1 ? "copy" : "copies"} of "${prodTitle}" ${currentProduct.stock === 1 ? "is" : "are"} now available. Your order has been cancelled. Please update your cart quantity and try again.`,
          });
        }
      }
    }
    let razorpayOrderData = null;
    if (paymentMethod === 'Razorpay') {
      try {
        const paymentOrder = await paymentService.createPaymentOrder({
          amount: totalAmount,
          orderId: order._id.toString()
        }, 'razorpay');
        order.paymentDetails = {
          paymentOrderId: paymentOrder.id,
          gateway: 'razorpay'
        };
        await order.save();
        razorpayOrderData = paymentOrder;
      } catch (err) {
        await orderService.cancelOrder(order._id, MESSAGES.PAYMENT.ORDER_CREATION_FAILED);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.PAYMENT.ORDER_CREATION_FAILED });
      }
    } else if (paymentMethod === 'Wallet') {
      const user = await User.findById(userId);
      if (user.walletBalance < totalAmount) {
        await orderService.cancelOrder(order._id, "Insufficient wallet balance");
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Insufficient wallet balance" });
      }
      user.walletBalance -= totalAmount;
      await user.save();
      await WalletTransaction.create({
        user: userId,
        type: 'debit',
        amount: totalAmount,
        description: `Payment for order ${order.orderId}`,
        orderId: order._id
      });
      order.paymentStatus = 'Paid';
      await order.save();

      const OrderModel = (await import('../../shared/models/Order.js')).default;
      const referralService = await import('../../shared/services/referral.service.js');
      
      if (user && user.referredBy) {
        const previousOrders = await OrderModel.countDocuments({
          user: userId,
          paymentStatus: 'Paid',
          _id: { $ne: order._id }
        });
        
        if (previousOrders === 0) {
          await referralService.distributeReferrerReward(userId);
        }
      }
    }
    await cartService.clearCart(userId);
    req.session.appliedCoupon = null;
    if (paymentMethod === 'Razorpay' && razorpayOrderData) {
      res.json({
        success: true,
        paymentRequired: true,
        razorpayOrderId: razorpayOrderData.id,
        amount: razorpayOrderData.amount,
        currency: razorpayOrderData.currency,
        orderId: order._id,
        orderNumber: order.orderId,
      });
    } else {
      res.json({
        success: true,
        message: MESSAGES.CUSTOM.ORDER_PLACED_SUCCESSFULLY,
        orderId: order._id,
        orderNumber: order.orderId,
      });
    }
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};
export const validateOrderCoupon = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    if (order.user._id.toString() !== userId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.COMMON.UNAUTHORIZED,
      });
    }
    if (!order.couponCode || order.discount <= 0) {
      return res.json({
        success: true,
        isValid: true,
        discount: 0,
        message: MESSAGES.CUSTOM.NO_COUPON_APPLIED,
      });
    }
    const activeItems = order.items.filter(
      (item) => item.status !== "Cancelled" && item.status !== "Returned",
    );
    const activeSubtotal = activeItems.reduce((total, item) => {
      return total + item.price * item.actualQuantity;
    }, 0);
    try {
      const coupon = await couponService.validateCouponForActiveItems(
        order.couponCode,
        userId,
        activeSubtotal,
        activeItems,
      );
      const validDiscount = couponService.calculateDiscount(
        coupon,
        activeSubtotal,
      );
      return res.json({
        success: true,
        isValid: true,
        discount: validDiscount,
        activeSubtotal,
        minPurchaseAmount: coupon.minPurchaseAmount,
        message: MESSAGES.CUSTOM.COUPON_IS_VALID_FOR_ACTIVE_ITEMS,
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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_VALIDATE_COUPON,
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
