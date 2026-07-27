import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

let razorpayInstance = null;
if (keyId && keySecret) {
  try {
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  } catch (err) {
    console.error("Razorpay init error:", err.message);
  }
}

export const paymentConfig = {
  razorpay: {
    instance: razorpayInstance,
    keyId: keyId,
    keySecret: keySecret,
  },
};
// Maximum order amount allowed for Cash on Delivery
export const COD_MAX_AMOUNT = 1000;
export { razorpayInstance };
