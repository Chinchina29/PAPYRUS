import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as paymentService from "../../shared/services/payment.service.js";
import Order from "../../shared/models/Order.js";

export const createPaymentOrder = async (req, res) => {
  res
    .status(HTTP_STATUS.NOT_IMPLEMENTED)
    .json({ success: false, message: "Not implemented here" });
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderId,
    } = req.body;
    const verificationResult = await paymentService.verifyPaymentSignature({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });
    if (verificationResult.isValid) {
      await paymentService.processPaymentSuccess(orderId, {
        paymentId: razorpay_payment_id,
        gateway: "razorpay",
      });
      return res.json({
        success: true,
        message: MESSAGES.PAYMENT.VERIFICATION_SUCCESS,
      });
    } else {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          message: MESSAGES.PAYMENT.VERIFICATION_FAILED,
        });
    }
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.PAYMENT.VERIFICATION_FAILED,
      });
  }
};

export const handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    await paymentService.processPaymentFailure(orderId, reason);
    res.json({ success: true, message: MESSAGES.PAYMENT.PAYMENT_FAILED });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

export const getPaymentSuccess = async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.redirect("/orders");
    }
    const order = await Order.findById(orderId).populate("items.product");
    if (!order) {
      return res.redirect("/orders");
    }
    if (order.user.toString() !== req.session.userId?.toString()) {
      return res.redirect("/orders");
    }
    res.render("user/payment-success", {
      order,
      orderId: order.orderId,
      currentPage_name: "orders",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect("/orders");
  }
};

export const getPaymentFailure = async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.redirect("/orders");
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.redirect("/orders");
    }
    if (order.user.toString() !== req.session.userId?.toString()) {
      return res.redirect("/orders");
    }
    res.render("user/payment-failure", {
      order,
      orderId: order.orderId,
      mongoOrderId: order._id.toString(),
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
      currentPage_name: "checkout",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect("/orders");
  }
};

export const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: "Order not found." });
    }
    if (order.user.toString() !== userId.toString()) {
      return res
        .status(HTTP_STATUS.FORBIDDEN)
        .json({ success: false, message: "Unauthorized." });
    }
    if (order.paymentStatus === "Paid") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: "This order has already been paid." });
    }
    if (order.orderStatus === "Cancelled") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          message: "This order has been cancelled and cannot be retried.",
        });
    }
    if ((order.paymentAttempts || 0) >= 5) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          message:
            "Maximum payment attempts (5) reached. Order has been cancelled.",
        });
    }

    const paymentOrder = await paymentService.createPaymentOrder(
      {
        amount: order.totalAmount,
        orderId: order._id.toString(),
      },
      "razorpay",
    );

    order.paymentDetails = {
      ...(order.paymentDetails || {}),
      paymentOrderId: paymentOrder.id,
      gateway: "razorpay",
    };
    await order.save();

    return res.json({
      success: true,
      razorpayOrderId: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      orderId: order._id,
      orderNumber: order.orderId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || "Failed to retry payment.",
      });
  }
};
