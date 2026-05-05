import * as cartService from "../services/cart.service.js";
import * as addressService from "../services/address.service.js";
import * as orderService from "../../shared/services/order.service.js";
import Product from "../../shared/models/Product.js";

export const getCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;

    const cart = await cartService.getOrCreateCart(userId);

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const addresses = await addressService.getUserAddresses(userId);
    const defaultAddress =
      addresses.find((addr) => addr.isDefault) || addresses[0];

    const subtotal = cart.totalAmount;
    const shippingCharge = subtotal >= 500 ? 0 : 50;
    const discount = req.session.appliedCoupon?.discount || 0;
    const totalAmount = subtotal + shippingCharge - discount;

    res.render("user/checkout", {
      cart,
      addresses,
      defaultAddress,
      subtotal,
      shippingCharge,
      discount,
      totalAmount,
      appliedCoupon: req.session.appliedCoupon || null,
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
        .select("stock isListed isDeleted category")
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
          message: `Product "${item.product.title}" is no longer available.`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.product.title}". Only ${product.stock} available.`,
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
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
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
    res.status(500).json({
      success: false,
      message: "Failed to place order. Please try again later.",
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
      return res.redirect("/orders?error=You do not have permission to view this order");
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
