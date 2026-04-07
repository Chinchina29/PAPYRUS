import express from "express";
import * as authController from "../controller/user/auth.controller.js";
import * as passwordController from "../controller/user/password.controller.js";
import * as oauthController from "../controller/user/oauth.controller.js";
import * as productController from "../controller/user/product.controller.js";
import * as emailService from "../services/email.service.js";
import * as sellerController from "../controller/user/seller.controller.js";
import {
  isNotAuthenticated,
  preventLoginIfAdminActive,
} from "../Middlewares/auth.middleware.js";
import {
  signupValidation,
  loginValidation,
  passwordResetValidation,
  validate,
} from "../Middlewares/validation.middleware.js";
import passport from "../config/passport.config.js";
import { requireRole } from "../Middlewares/auth.middleware.js";
import {
  showSetPassword,
  setGooglePassword,
  skipSetPassword,
} from "../controller/user/password.controller.js";

const router = express.Router();
const requireAuth = (req, res, next) => {
  if (!req.session?.userId) return res.redirect("/login");
  next();
};

router.get("/", (req, res) => {
  res.render("user/login");
});

router.get("/home", (req, res) => {
  if (req.session && req.session.userId) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  res.render("user/home");
});

router.get("/signup", isNotAuthenticated, (req, res) =>
  res.render("user/signup"),
);
router.post("/signup", authController.signup);

router.get("/signup/verify-otp", (req, res) => {
  if (!req.session.tempUserId) {
    return res.redirect("/signup");
  }
  res.render("user/verifyotp", {
    email: req.session.tempUserEmail,
    type: "signup",
  });
});
router.post("/signup/verify-otp", authController.verifyOTP);
router.post("/signup/resend-otp", authController.resendOTP);

router.get(
  "/login",
  isNotAuthenticated,
  preventLoginIfAdminActive,
  (req, res) => res.render("user/login"),
);

router.get(
  "/signin",
  isNotAuthenticated,
  preventLoginIfAdminActive,
  (req, res) => res.render("user/login"),
);

router.post("/login", preventLoginIfAdminActive, authController.login);

router.get("/forgot-password", isNotAuthenticated, (req, res) =>
  res.render("user/forgotpassword"),
);
router.post("/forgot-password/send", passwordController.forgotPassword);

router.get("/forgot-password/verify", (req, res) => {
  if (!req.session.resetEmail) {
    return res.redirect("/forgot-password");
  }
  res.render("user/verifyotp", {
    email: req.session.resetEmail,
    type: "reset",
  });
});
router.post("/forgot-password/verify", passwordController.verifyResetOTP);
router.post("/forgot-password/resend", passwordController.resendResetOTP);

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
  (req, res, next) => {
    next();
  },
  passport.authenticate("google", { failureRedirect: "/login" }),
  oauthController.googleCallback,
);

router.get("/set-password", showSetPassword);
router.post("/set-password", setGooglePassword);
router.get("/set-password/skip", skipSetPassword);

router.get("/logout", authController.logout);

router.get("/shop", productController.getShop);
router.get("/shop/:id", productController.getProductDetail);

if (process.env.NODE_ENV === "development") {
  router.get("/test-email/:email", async (req, res) => {
    try {
      const testResult = await emailService.sendOTPEmail(
        req.params.email,
        "123456",
        "Test User",
      );
      res.json({
        success: testResult.success,
        message: testResult.success ? "Test email sent!" : "Email failed",
        error: testResult.error || null,
        email: req.params.email,
      });
    } catch (error) {
      res.json({
        success: false,
        message: "Email test error",
        error: error.message,
      });
    }
  });

  router.get("/test-email-simple", async (req, res) => {
    try {
      const testResult = await emailService.sendOTPEmail(
        "chinchinalalu.kmm@gmail.com",
        "123456",
        "Test User",
      );
      res.json({
        success: testResult.success,
        message: testResult.success ? "Test email sent!" : "Email failed",
        error: testResult.error || null,
      });
    } catch (error) {
      res.json({
        success: false,
        message: "Email test error",
        error: error.message,
      });
    }
  });
}

router.get("/sell", requireAuth, sellerController.getSellPage);
router.post("/sell", requireAuth, sellerController.submitBook);
router.get("/sell/my-listings", requireAuth, sellerController.getMyListings);

export default router;
