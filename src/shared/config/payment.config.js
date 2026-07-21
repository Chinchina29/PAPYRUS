import Razorpay from 'razorpay';
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
export const paymentConfig = {
  razorpay: {
    instance: razorpayInstance,
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
};
// Maximum order amount allowed for Cash on Delivery
export const COD_MAX_AMOUNT = 1000;
export { razorpayInstance };
