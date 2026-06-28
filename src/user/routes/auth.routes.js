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
import {
  authLimiter,
  emailLimiter,
} from "../../shared/middleware/rateLimiting.middleware.js";
const router = express.Router();
router.get("/", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/home");
  }
  res.render("user/home-landing", { user: null });
});
router.get("/home", async (req, res) => {
  if (req.session && req.session.userId) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    const isNewUser = req.session.isNewUser || false;
    let categories = [];
    if (isNewUser) {
      try {
        const categoryService = await import("../../admin/services/category.service.js");
        categories = await categoryService.getMainCategories();
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    }
    return res.render("user/home", { 
      user: req.session.user,
      isNewUser,
      categories
    });
  }
  res.redirect("/");
});
router.get("/signup", isNotAuthenticated, (req, res) =>
  res.render("user/signup"),
);
router.post("/signup", signupValidation, validate, authLimiter, authController.signup);
router.get("/signup/verify-otp", (req, res) => {
  if (!req.session.tempUserId) {
    return res.redirect("/signup");
  }
  res.render("user/verifyotp", {
    email: req.session.tempUserEmail,
    type: "signup",
  });
});
router.post("/signup/verify-otp", authLimiter, authController.verifyOTP);
router.post("/signup/resend-otp", emailLimiter, authController.resendOTP);
router.get(
  "/login",
  isNotAuthenticated,
  preventAdminFromUserAuth,
  (req, res) => res.render("user/login"),
);
router.get(
  "/signin",
  isNotAuthenticated,
  preventAdminFromUserAuth,
  (req, res) => res.render("user/login"),
);
router.post(
  "/login",
  loginValidation,
  validate,
  authLimiter,
  preventAdminFromUserAuth,
  authController.login,
);
router.get("/forgot-password", isNotAuthenticated, (req, res) =>
  res.render("user/forgotpassword"),
);
router.post(
  "/forgot-password/send",
  emailLimiter,
  passwordController.forgotPassword,
);
router.get("/forgot-password/verify", (req, res) => {
  if (!req.session.resetEmail) {
    return res.redirect("/forgot-password");
  }
  res.render("user/verifyotp", {
    email: req.session.resetEmail,
    type: "reset",
  });
});
router.post(
  "/forgot-password/verify",
  authLimiter,
  passwordController.verifyResetOTP,
);
router.post(
  "/forgot-password/resend",
  emailLimiter,
  passwordController.resendResetOTP,
);
router.get("/forgot-password/reset", (req, res) => {
  if (!req.session.resetEmail || !req.session.resetVerified) {
    return res.redirect("/forgot-password");
  }
  res.render("user/resetpassword");
});
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
router.post("/set-password", authLimiter, setGooglePassword);
router.get("/set-password/skip", skipSetPassword);
router.get("/logout", authController.logout);
router.post("/save-genre-preferences", authController.saveGenrePreferences);
router.post("/skip-genre-selection", authController.skipGenreSelection);
router.get("/shop", productController.getShop);
router.get("/shop/:id", productController.getProductDetail);
export default router;
