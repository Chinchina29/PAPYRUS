import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as paymentService from "../../shared/services/payment.service.js";

export const createPaymentOrder = async (req, res) => {
  // Mostly handled in checkout.controller.js directly
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
    console.error("Verification error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || MESSAGES.PAYMENT.VERIFICATION_FAILED });
  }
};

export const handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    await paymentService.processPaymentFailure(orderId, reason);
    res.json({ success: true, message: MESSAGES.PAYMENT.PAYMENT_FAILED });
  } catch (error) {
    console.error("Payment failure handling error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

export const getPaymentSuccess = async (req, res) => {
  res.redirect("/orders");
};

export const getPaymentFailure = async (req, res) => {
  const { orderId } = req.query;
  res.render("user/payment-failure", {
    orderId,
    currentPage_name: "checkout",
    user: req.session.user || null,
  });
};
