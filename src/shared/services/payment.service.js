const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');

class PaymentGatewayService {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        this.keySecret = process.env.RAZORPAY_KEY_SECRET;
    }

    async createPaymentOrder(orderData, gateway = 'razorpay') {
        try {
            if (gateway !== 'razorpay') {
                throw new Error('Only Razorpay gateway is supported');
            }

            if (!orderData.amount || orderData.amount <= 0 || isNaN(orderData.amount)) {
                throw new Error('Invalid order amount');
            }

            const options = {
                amount: Math.round(orderData.amount * 100),
                currency: 'INR',
                receipt: orderData.orderId || `receipt_${Date.now()}`,
                payment_capture: 1
            };

            const paymentOrder = await this.razorpay.orders.create(options);
            
            return {
                id: paymentOrder.id,
                amount: paymentOrder.amount,
                currency: paymentOrder.currency,
                receipt: paymentOrder.receipt,
                status: paymentOrder.status
            };
        } catch (error) {
            console.error('Payment order creation failed:', error);
            throw new Error(`Payment order creation failed: ${error.message}`);
        }
    }

    async verifyPaymentSignature(paymentData) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                throw new Error('Missing required payment verification data');
            }

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', this.keySecret)
                .update(body.toString())
                .digest('hex');

            const isSignatureValid = expectedSignature === razorpay_signature;

            if (!isSignatureValid) {
                throw new Error('Payment signature verification failed');
            }

            return {
                isValid: true,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            };
        } catch (error) {
            console.error('Payment signature verification error:', error);
            throw error;
        }
    }

    async processPaymentSuccess(orderId, paymentDetails) {
        try {
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.paymentStatus = 'Paid';
            order.orderStatus = 'Processing';
            order.paymentDetails = {
                ...order.paymentDetails,
                transactionId: paymentDetails.paymentId,
                paidAt: new Date(),
                gateway: paymentDetails.gateway || 'razorpay'
            };

            await order.save();
            return order;
        } catch (error) {
            console.error('Payment success processing error:', error);
            throw error;
        }
    }

    async processPaymentFailure(orderId, failureReason) {
        try {
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.paymentStatus = 'Failed';
            order.paymentAttempts = (order.paymentAttempts || 0) + 1;
            order.paymentFailureReason = failureReason;

            if (order.paymentAttempts >= 5) {
                order.orderStatus = 'Cancelled';
                order.cancelledAt = new Date();
                order.cancellationReason = 'Maximum payment attempts exceeded';
            }

            await order.save();
            return order;
        } catch (error) {
            console.error('Payment failure processing error:', error);
            throw error;
        }
    }

    async handleWebhook(webhookBody, signature) {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.keySecret)
                .update(webhookBody)
                .digest('hex');

            if (expectedSignature !== signature) {
                throw new Error('Webhook signature verification failed');
            }

            const event = JSON.parse(webhookBody);
            
            switch (event.event) {
                case 'payment.captured':
                    await this.handlePaymentCaptured(event.payload.payment.entity);
                    break;
                case 'payment.failed':
                    await this.handlePaymentFailed(event.payload.payment.entity);
                    break;
                default:
                    console.log(`Unhandled webhook event: ${event.event}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Webhook handling error:', error);
            throw error;
        }
    }

    async handlePaymentCaptured(paymentEntity) {
        try {
            const order = await Order.findOne({
                'paymentDetails.paymentOrderId': paymentEntity.order_id
            });

            if (order && order.paymentStatus !== 'Paid') {
                await this.processPaymentSuccess(order._id, {
                    paymentId: paymentEntity.id,
                    gateway: 'razorpay'
                });
            }
        } catch (error) {
            console.error('Payment captured webhook error:', error);
            throw error;
        }
    }

    async handlePaymentFailed(paymentEntity) {
        try {
            const order = await Order.findOne({
                'paymentDetails.paymentOrderId': paymentEntity.order_id
            });

            if (order && order.paymentStatus !== 'Failed') {
                await this.processPaymentFailure(order._id, paymentEntity.error_description || 'Payment failed');
            }
        } catch (error) {
            console.error('Payment failed webhook error:', error);
            throw error;
        }
    }
}

const paymentGatewayService = new PaymentGatewayService();

module.exports = {
    PaymentGatewayService,
    createPaymentOrder: (orderData, gateway) => paymentGatewayService.createPaymentOrder(orderData, gateway),
    verifyPaymentSignature: (paymentData) => paymentGatewayService.verifyPaymentSignature(paymentData),
    processPaymentSuccess: (orderId, paymentDetails) => paymentGatewayService.processPaymentSuccess(orderId, paymentDetails),
    processPaymentFailure: (orderId, failureReason) => paymentGatewayService.processPaymentFailure(orderId, failureReason),
    handleWebhook: (webhookBody, signature) => paymentGatewayService.handleWebhook(webhookBody, signature),
    verifyRazorpayPayment: (paymentData) => paymentGatewayService.verifyPaymentSignature(paymentData)
};