import express from "express";
import * as authController from "../controllers/auth.controller.js";
import * as passwordController from "../controllers/password.controller.js";
import * as oauthController from "../controllers/oauth.controller.js";
import * as productController from "../controllers/product.controller.js";
import {
  isNotAuthenticated,
  preventAdminFromUserAuth,
} from "../middleware/auth.middleware.js";
import {
  passwordResetValidation,
  validate,
  signupValidation,
  loginValidation,
} from "../../shared/middleware/validation.middleware.js";
import passport from "../../shared/config/passport.config.js";
import {
  showSetPassword,
  setGooglePassword,
  skipSetPassword,
} from "../controllers/password.controller.js";

const router = express.Router();

router.get("/", authController.getLandingPage);
router.get("/home", authController.getHomePage);

router.get("/signup", isNotAuthenticated, authController.getSignupPage);
router.post("/signup", signupValidation, validate, authController.signup);
router.get("/signup/verify-otp", authController.getVerifyOtpPage);
router.post("/signup/verify-otp", authController.verifyOTP);
router.post("/signup/resend-otp", authController.resendOTP);

router.get(
  "/login",
  isNotAuthenticated,
  preventAdminFromUserAuth,
  authController.getLoginPage,
);
router.get(
  "/signin",
  isNotAuthenticated,
  preventAdminFromUserAuth,
  authController.getLoginPage,
);
router.post(
  "/login",
  loginValidation,
  validate,
  preventAdminFromUserAuth,
  authController.login,
);

router.get(
  "/forgot-password",
  isNotAuthenticated,
  authController.getForgotPasswordPage,
);
router.post("/forgot-password/send", passwordController.forgotPassword);
router.get(
  "/forgot-password/verify",
  authController.getForgotPasswordVerifyPage,
);
router.post("/forgot-password/verify", passwordController.verifyResetOTP);
router.post("/forgot-password/resend", passwordController.resendResetOTP);
router.get("/forgot-password/reset", authController.getForgotPasswordResetPage);
router.post(
  "/forgot-password/reset",
  passwordResetValidation,
  validate,
  passwordController.resetPassword,
);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  oauthController.googleCallback,
);

router.get("/set-password", showSetPassword);
router.post("/set-password", setGooglePassword);
router.get("/set-password/skip", skipSetPassword);

router.get("/logout", authController.logout);

router.post("/save-genre-preferences", authController.saveGenrePreferences);
router.post("/skip-genre-selection", authController.skipGenreSelection);

router.get("/shop", productController.getShop);
router.get("/shop/:id", productController.getProductDetail);

export default router;
