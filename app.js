import "dotenv/config";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import connectDB from "./config/mongo.config.js";
import passport from "./config/passport.config.js";
import * as oauthController from "./controller/oauth.controller.js";

import * as authController from "./controller/auth.controller.js";
import * as passwordController from "./controller/password.controller.js";

import {
  isAuthenticated,
  isNotAuthenticated,
  setUserLocals,
} from "./Middlewares/auth.middleware.js";
import {
  signupValidation,
  loginValidation,
  validate,
} from "./Middlewares/validation.middleware.js";

const app = express();

connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", "./Views");

app.use(express.static("public"));

app.use(setUserLocals);

app.get("/", (req, res) => {
  res.render("user/home");
});

app.get("/home", (req, res) => {
  res.render("user/home");
});

app.get("/signup", isNotAuthenticated, (req, res) => {
  res.render("user/signup");
});

app.post("/signup", signupValidation, validate, authController.signup);

app.get("/signup/verify-otp", (req, res) => {
  if (!req.session.tempUserId) {
    return res.redirect("/signup");
  }
  res.render("user/verifyotp", {
    email: req.session.tempUserEmail,
    type: "signup",
  });
});

app.post("/signup/verify-otp", authController.verifyOTP);

app.post("/signup/resend-otp", authController.resendOTP);

app.get("/login", isNotAuthenticated, (req, res) => {
  res.render("user/login");
});

app.get("/signin", isNotAuthenticated, (req, res) => {
  res.render("user/login");
});

app.post("/login", loginValidation, validate, authController.login);

app.get("/forgot-password", isNotAuthenticated, (req, res) => {
  res.render("user/forgotpassword");
});

app.post("/forgot-password/send", passwordController.forgotPassword);

app.get("/forgot-password/verify", (req, res) => {
  if (!req.session.resetEmail) {
    return res.redirect("/forgot-password");
  }
  res.render("user/verifyotp", {
    email: req.session.resetEmail,
    type: "reset",
  });
});

app.post("/forgot-password/verify", passwordController.verifyResetOTP);

app.post("/forgot-password/resend", passwordController.resendResetOTP);

app.get("/forgot-password/reset", (req, res) => {
  if (!req.session.resetEmail || !req.session.resetVerified) {
    return res.redirect("/forgot-password");
  }
  res.render("user/resetpassword");
});

app.post("/forgot-password/reset", passwordController.resetPassword);

app.get("/profile", isAuthenticated, (req, res) => {
  res.render("user/profile");
});

app.get("/profile/edit", isAuthenticated, (req, res) => {
  res.render("user/editprofile");
});

app.get("/profile/address", isAuthenticated, (req, res) => {
  res.render("user/addaddress");
});

app.post("/profile/address/add", isAuthenticated, (req, res) => {
  res.redirect("/profile/address");
});

app.post("/profile/update", isAuthenticated, (req, res) => {
  res.redirect("/profile");
});

app.get("/logout", authController.logout);

app.get("/admin/signin", (req, res) => {
  res.render("admin/adminsignin");
});
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  oauthController.googleCallback,
);
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] }),
);
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  oauthController.facebookCallback,
);

app.post("/admin/signin", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).send("Something went wrong!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`\n Ready to accept requests!\n`);
});
