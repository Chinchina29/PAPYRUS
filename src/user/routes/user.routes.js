import express from "express";
import * as productController from "../controllers/product.controller.js";
import * as profileController from "../controllers/profile.controller.js";
import * as addressController from "../controllers/address.controller.js";
import * as cartController from "../controllers/cart.controller.js";
import * as sellerController from "../controllers/seller.controller.js";
import * as reviewController from "../controllers/review.controller.js";
import * as wishlistController from "../controllers/wishlist.controller.js";
import * as orderController from "../controllers/order.controller.js";
import { upload, videoUpload } from "../../shared/config/cloudinary.config.js";
import { 
  generalApiLimiter, 
  uploadLimiter, 
  cartLimiter, 
  emailLimiter,
  searchLimiter 
} from "../../shared/middleware/rateLimiting.middleware.js";

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    const isAjax = req.xhr || 
                   req.headers.accept?.includes('application/json') ||
                   req.get('X-Requested-With') === 'XMLHttpRequest';
    
    if (isAjax) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue",
        redirectUrl: "/login"
      });
    } else {
      return res.redirect('/login');
    }
  }
  next();
};

router.get("/shop", searchLimiter, productController.getShop);
router.get("/shop/:id", generalApiLimiter, productController.getProductDetail);

router.get("/profile", requireAuth, profileController.showProfile);
router.get("/profile/edit", requireAuth, profileController.showEditProfile);
router.post("/profile/edit", requireAuth, generalApiLimiter, profileController.updateProfile);
router.post("/profile/update", requireAuth, generalApiLimiter, profileController.updateProfile);
router.get("/profile/change-password", requireAuth, profileController.showChangePassword);
router.post("/profile/change-password", requireAuth, generalApiLimiter, profileController.changePassword);
router.post("/profile/upload-avatar", requireAuth, uploadLimiter, upload.single('avatar'), profileController.uploadAvatar);
router.delete("/profile/profile-picture", requireAuth, generalApiLimiter, profileController.removeProfilePicture);
router.post("/profile/request-email-change", requireAuth, emailLimiter, profileController.requestEmailChange);
router.post("/profile/verify-email-change", requireAuth, generalApiLimiter, profileController.verifyEmailChange);
router.post("/profile/resend-email-otp", requireAuth, emailLimiter, profileController.resendEmailOTP);
router.post("/profile/cancel-email-change", requireAuth, generalApiLimiter, profileController.cancelEmailChange);

router.get("/profile/addresses", requireAuth, addressController.showAddresses);
router.get("/profile/addresses/add", requireAuth, addressController.showAddAddress);
router.post("/profile/addresses/add", requireAuth, generalApiLimiter, addressController.addAddress);
router.get("/profile/addresses/edit/:id", requireAuth, addressController.showEditAddress);
router.post("/profile/addresses/edit/:id", requireAuth, generalApiLimiter, addressController.updateAddress);
router.put("/profile/addresses/:id", requireAuth, generalApiLimiter, addressController.updateAddress);
router.delete("/profile/addresses/:id", requireAuth, generalApiLimiter, addressController.deleteAddress);
router.delete("/profile/addresses/delete/:id", requireAuth, generalApiLimiter, addressController.deleteAddress);
router.post("/profile/addresses/:id/set-default", requireAuth, generalApiLimiter, addressController.setDefaultAddress);

router.get("/cart", requireAuth, cartController.getCart);
router.post("/cart/add", requireAuth, cartLimiter, cartController.addToCart);
router.put("/cart/update/:productId", requireAuth, cartLimiter, cartController.updateCartItem);
router.delete("/cart/remove/:productId", requireAuth, cartLimiter, cartController.removeFromCart);
router.delete("/cart/clear", requireAuth, cartLimiter, cartController.clearCart);
router.get("/cart/count", cartController.getCartCount);
router.post("/cart/validate-coupon", requireAuth, generalApiLimiter, cartController.validateCoupon);
router.post("/cart/remove-coupon", requireAuth, generalApiLimiter, cartController.removeCoupon);

router.get("/sell", requireAuth, sellerController.getSellPage);
router.post("/sell", requireAuth, sellerController.submitBook);
router.post("/sell/upload-video", requireAuth, uploadLimiter, videoUpload.single('video'), sellerController.uploadVideo);
router.get("/sell/my-listings", requireAuth, sellerController.getMyListings);
router.get("/sell/create", requireAuth, sellerController.getCreatePage);

router.post("/reviews", requireAuth, generalApiLimiter, reviewController.addReview);
router.get("/reviews/product/:productId", reviewController.getProductReviews);
router.put("/reviews/:reviewId", requireAuth, generalApiLimiter, reviewController.updateReview);
router.delete("/reviews/:reviewId", requireAuth, generalApiLimiter, reviewController.deleteReview);
router.post("/reviews/:reviewId/helpful", generalApiLimiter, reviewController.markHelpful);

router.get("/wishlist", requireAuth, wishlistController.getWishlist);
router.post("/wishlist/add", requireAuth, cartLimiter, wishlistController.addToWishlist);
router.delete("/wishlist/remove/:productId", requireAuth, cartLimiter, wishlistController.removeFromWishlist);
router.delete("/wishlist/clear", requireAuth, cartLimiter, wishlistController.clearWishlist);
router.get("/wishlist/count", wishlistController.getWishlistCount);
router.get("/wishlist/status/:productId", requireAuth, wishlistController.checkWishlistStatus);

router.get("/orders", requireAuth, orderController.getUserOrders);
router.get("/orders/:id", requireAuth, orderController.getOrderDetail);

export default router;