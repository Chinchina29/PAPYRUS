import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as paymentService from "../../shared/services/payment.service.js";
export const createPaymentOrder = async (req, res) => {
  res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({ success: false, message: "Not implemented here" });
};
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
    const verificationResult = await paymentService.verifyPaymentSignature({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    });
    if (verificationResult.isValid) {
      await paymentService.processPaymentSuccess(orderId, {
        paymentId: razorpay_payment_id,
        gateway: 'razorpay'
      });
      return res.json({ success: true, message: MESSAGES.PAYMENT.VERIFICATION_SUCCESS });
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.PAYMENT.VERIFICATION_FAILED });
    }
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || MESSAGES.PAYMENT.VERIFICATION_FAILED });
  }
};
export const handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    await paymentService.processPaymentFailure(orderId, reason);
    res.json({ success: true, message: MESSAGES.PAYMENT.PAYMENT_FAILED });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};
export const getPaymentSuccess = async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.redirect("/orders");
    }
    const Order = (await import("../../shared/models/Order.js")).default;
    const order = await Order.findById(orderId).populate('items.product');
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
      return res.redirect("/cart");
    }
    const Order = (await import("../../shared/models/Order.js")).default;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.redirect("/cart");
    }
    if (order.user.toString() !== req.session.userId?.toString()) {
      return res.redirect("/cart");
    }
    res.render("user/payment-failure", {
      order,
      orderId: order.orderId,
      currentPage_name: "checkout",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect("/cart");
  }
};
