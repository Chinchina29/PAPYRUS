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

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const stockIssues = [];
    let hasStockChanges = false;
    
    const originalCart = await cartService.getOrCreateCart(userId, req.session);
    
    if (originalCart.outOfStockItems && originalCart.outOfStockItems.length > 0) {
      originalCart.outOfStockItems.forEach(item => {
        stockIssues.push(`"${item.title}" was removed from your cart (out of stock)`);
        hasStockChanges = true;
      });
    }
    
    if (originalCart.stockAdjustedItems && originalCart.stockAdjustedItems.length > 0) {
      originalCart.stockAdjustedItems.forEach(item => {
        stockIssues.push(`"${item.title}" quantity reduced from ${item.originalQuantity} to ${item.newQuantity} (limited stock)`);
        hasStockChanges = true;
      });
    }
    
    if (req.session.stockAdjustedItems && req.session.stockAdjustedItems.length > 0) {
      req.session.stockAdjustedItems.forEach(item => {
        stockIssues.push(`"${item.title}" quantity was reduced from ${item.originalQuantity} to ${item.newQuantity} (limited stock)`);
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
      } else if (product.stock === 0) {
        stockIssues.push(`"${item.product.title}" is out of stock`);
        hasStockChanges = true;
      } else if (product.stock < item.quantity) {
        stockIssues.push(
          `"${item.product.title}" — only ${product.stock} left (you have ${item.quantity} in cart)`,
        );
        hasStockChanges = true;
      } else if (product.stock < 5) {
        stockIssues.push(`"${item.product.title}" — only ${product.stock} left in stock`);
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

    const subtotal = cart.totalAmount;
    const shippingCharge = subtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const totalAmount = subtotal + shippingCharge - discount;

    const now = new Date();
    const availableCoupons = await Coupon.find({
      isDeleted: false,
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ["$usageCount", "$usageLimit"] } },
      ],
      minPurchaseAmount: { $lte: subtotal },
    })
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "title")
      .sort({ discountValue: -1 })
      .limit(10);

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
        return res.status(400).json({
          success: false,
          message: `"${item.product.title}" is currently out of stock. Please remove it from your cart or check back later.`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.product.title}". Only ${product.stock} ${product.stock === 1 ? 'copy' : 'copies'} available, but you have ${item.quantity} in your cart. Please update the quantity.`,
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

    const subtotal = cart.totalAmount;
    const shippingCharge = subtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const totalAmount = subtotal + shippingCharge - discount;

    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      title: item.product.title,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
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
      subtotal,
      shippingCharge,
      discount,
      couponCode: req.session.appliedCoupon?.code || null,
      totalAmount,
      orderNotes: orderNotes || "",
    };

    const order = await orderService.createOrder(orderData);

    for (const item of cart.items) {
      const updateResult = await Product.findOneAndUpdate(
        { 
          _id: item.product._id,
          stock: { $gte: item.quantity }
        },
        {
          $inc: { stock: -item.quantity }
        },
        { new: true }
      );

      if (!updateResult) {
        await orderService.cancelOrder(order._id, "Stock unavailable during order processing");
        
        const currentProduct = await Product.findById(item.product._id).select('stock title');
        
        if (!currentProduct || currentProduct.stock === 0) {
          return res.status(400).json({
            success: false,
            message: `Sorry, "${item.product.title}" just went out of stock. Your order has been cancelled. Please refresh your cart and try again.`,
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `Sorry, only ${currentProduct.stock} ${currentProduct.stock === 1 ? 'copy' : 'copies'} of "${item.product.title}" ${currentProduct.stock === 1 ? 'is' : 'are'} now available. Your order has been cancelled. Please update your cart and try again.`,
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
