import express from "express";
import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as productController from "../controllers/product.controller.js";
import * as profileController from "../controllers/profile.controller.js";
import * as addressController from "../controllers/address.controller.js";
import * as cartController from "../controllers/cart.controller.js";
import * as sellerController from "../controllers/seller.controller.js";
import * as reviewController from "../controllers/review.controller.js";
import * as wishlistController from "../controllers/wishlist.controller.js";
import * as orderController from "../controllers/order.controller.js";
import * as checkoutController from "../controllers/checkout.controller.js";
import * as walletController from "../controllers/wallet.controller.js";
import paymentRoutes from "./payment.routes.js";
import { upload, videoUpload } from "../../shared/config/cloudinary.config.js";
const router = express.Router();
const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    const isAjax =
      req.xhr ||
      req.headers.accept?.includes("application/json") ||
      req.get("X-Requested-With") === "XMLHttpRequest";
    if (isAjax) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_LOG_IN_TO_CONTINUE,
        redirectUrl: "/login",
      });
    } else {
      return res.redirect("/login");
    }
  }
  next();
};
router.get("/shop", productController.getShop);
router.get("/shop/:id", productController.getProductDetail);
router.get("/profile", requireAuth, profileController.showProfile);
router.get("/profile/edit", requireAuth, profileController.showEditProfile);
router.post(
  "/profile/edit",
  requireAuth,
  profileController.updateProfile,
);
router.post(
  "/profile/update",
  requireAuth,
  profileController.updateProfile,
);
router.get(
  "/profile/change-password",
  requireAuth,
  profileController.showChangePassword,
);
router.post(
  "/profile/change-password",
  requireAuth,
  profileController.changePassword,
);
router.post(
  "/profile/upload-avatar",
  requireAuth,
  upload.single("avatar"),
  profileController.uploadAvatar,
);
router.delete(
  "/profile/profile-picture",
  requireAuth,
  profileController.removeProfilePicture,
);
router.post(
  "/profile/request-email-change",
  requireAuth,
  profileController.requestEmailChange,
);
router.post(
  "/profile/verify-email-change",
  requireAuth,
  profileController.verifyEmailChange,
);
router.post(
  "/profile/resend-email-otp",
  requireAuth,
  profileController.resendEmailOTP,
);
router.post(
  "/profile/cancel-email-change",
  requireAuth,
  profileController.cancelEmailChange,
);
router.get("/profile/addresses", requireAuth, addressController.showAddresses);
router.get(
  "/profile/addresses/add",
  requireAuth,
  addressController.showAddAddress,
);
router.post(
  "/profile/addresses/add",
  requireAuth,
  addressController.addAddress,
);
router.get(
  "/profile/addresses/edit/:id",
  requireAuth,
  addressController.showEditAddress,
);
router.post(
  "/profile/addresses/edit/:id",
  requireAuth,
  addressController.updateAddress,
);
router.put(
  "/profile/addresses/:id",
  requireAuth,
  addressController.updateAddress,
);
router.delete(
  "/profile/addresses/:id",
  requireAuth,
  addressController.deleteAddress,
);
router.delete(
  "/profile/addresses/delete/:id",
  requireAuth,
  addressController.deleteAddress,
);
router.post(
  "/profile/addresses/:id/set-default",
  requireAuth,
  addressController.setDefaultAddress,
);
router.get("/profile/wallet", requireAuth, walletController.getWallet);
router.get("/cart", requireAuth, cartController.getCart);
router.post("/cart/add", requireAuth, cartController.addToCart);
router.put(
  "/cart/update/:productId",
  requireAuth,
  cartController.updateCartItem,
);
router.delete(
  "/cart/remove/:productId",
  requireAuth,
  cartController.removeFromCart,
);
router.delete(
  "/cart/clear",
  requireAuth,
  cartController.clearCart,
);
router.get("/cart/count", cartController.getCartCount);
router.get("/cart/summary", cartController.getCartSummary);
router.get("/cart/available-coupons", requireAuth, cartController.getAvailableCoupons);
router.post(
  "/cart/validate-coupon",
  requireAuth,
  cartController.validateCoupon,
);
router.post(
  "/cart/remove-coupon",
  requireAuth,
  cartController.removeCoupon,
);
router.post(
  "/cart/check-stock",
  requireAuth,
  cartController.checkStock,
);
router.get("/sell", requireAuth, sellerController.getSellPage);
router.post("/sell", requireAuth, sellerController.submitBook);
router.post(
  "/sell/upload-video",
  requireAuth,
  videoUpload.single("video"),
  sellerController.uploadVideo,
);
router.get("/sell/my-listings", requireAuth, sellerController.getMyListings);
router.get("/sell/create", requireAuth, sellerController.getCreatePage);
router.delete(
  "/sell/submission/:id",
  requireAuth,
  sellerController.deleteSubmission,
);
router.patch(
  "/sell/product/:productId/stock",
  requireAuth,
  sellerController.updateProductStock,
);
router.post(
  "/reviews",
  requireAuth,
  reviewController.addReview,
);
router.get("/reviews/product/:productId", reviewController.getProductReviews);
router.put(
  "/reviews/:reviewId",
  requireAuth,
  reviewController.updateReview,
);
router.delete(
  "/reviews/:reviewId",
  requireAuth,
  reviewController.deleteReview,
);
router.post(
  "/reviews/:reviewId/helpful",
  reviewController.markHelpful,
);
router.get("/wishlist", requireAuth, wishlistController.getWishlist);
router.post(
  "/wishlist/add",
  requireAuth,
  wishlistController.addToWishlist,
);
router.delete(
  "/wishlist/remove/:productId",
  requireAuth,
  wishlistController.removeFromWishlist,
);
router.delete(
  "/wishlist/clear",
  requireAuth,
  wishlistController.clearWishlist,
);
router.get("/wishlist/count", wishlistController.getWishlistCount);
router.get(
  "/wishlist/status/:productId",
  requireAuth,
  wishlistController.checkWishlistStatus,
);
router.get("/orders", requireAuth, orderController.getUserOrders);
router.get("/orders/:id", requireAuth, orderController.getOrderDetail);
router.get("/orders/:id/invoice", requireAuth, orderController.downloadInvoice);
router.post(
  "/orders/:orderId/cancel",
  requireAuth,
  orderController.cancelOrder,
);
router.post(
  "/orders/:orderId/return",
  requireAuth,
  orderController.returnOrder,
);
router.get("/checkout", requireAuth, checkoutController.getCheckout);
router.post(
  "/checkout/place-order",
  requireAuth,
  checkoutController.placeOrder,
);
router.get(
  "/checkout/validate-coupon/:orderId", 
  requireAuth, 
  checkoutController.validateOrderCoupon
);
router.get(
  "/order-success/:orderId",
  requireAuth,
  checkoutController.getOrderSuccess,
);
router.use("/payment", paymentRoutes);
export default router;

