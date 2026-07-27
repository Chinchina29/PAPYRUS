import "dotenv/config";
import express from "express";
import multer from "multer";
import session from "express-session";
import cookieParser from "cookie-parser";
import HTTP_STATUS from "./src/shared/constants/httpStatus.js";
import MESSAGES from "./src/shared/constants/messages.js";
import connectDB from "./src/shared/config/mongo.config.js";
import passport from "./src/shared/config/passport.config.js";
import { setUserLocals } from "./src/user/middleware/auth.middleware.js";
import { secureHeaders } from "./src/shared/middleware/cache.middleware.js";
import { registerCurrencyHelpers } from "./src/shared/utils/currency.js";
import {
  userSessionStore,
  adminSessionStore,
} from "./src/shared/config/session.config.js";
import * as userService from "./src/shared/services/user.service.js";
import authRoutes from "./src/user/routes/auth.routes.js";
import userRoutes from "./src/user/routes/user.routes.js";
import adminRoutes from "./src/admin/routes/admin.routes.js";
import referralRoutes from "./src/user/routes/referral.routes.js";
import adminReferralRoutes from "./src/admin/routes/referral.routes.js";
const requiredEnvVars = [
  "MONGODB_URI",
  "SESSION_SECRET",
  "ADMIN_SESSION_SECRET",
];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  process.exit(1);
}
const app = express();
app.set("trust proxy", 1);
connectDB();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
const userSession = session({
  secret: process.env.SESSION_SECRET,
  name: "papyrus.user.sid",
  resave: false,
  saveUninitialized: false,
  store: userSessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});
const adminSession = session({
  secret: process.env.ADMIN_SESSION_SECRET,
  name: "papyrus.admin.sid",
  resave: false,
  saveUninitialized: false,
  store: adminSessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});
app.use("/admin", adminSession);
app.use(userSession);
app.use((req, res, next) => {
  if (req.path.startsWith("/admin")) return next();
  if (req.session && req.session.userId && req.session.lastActivity) {
    const timeDiff = Date.now() - new Date(req.session.lastActivity).getTime();
    const maxInactivity = 1000 * 60 * 30;
    if (timeDiff > maxInactivity) {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.user.sid");
        if (req.xhr || req.headers.accept?.includes("json")) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: MESSAGES.AUTH.SESSION_EXPIRED,
            redirectUrl: "/login",
          });
        }
        return res.redirect("/login?error=timeout");
      });
    }
    req.session.lastActivity = new Date();
  }
  next();
});

app.use(async (req, res, next) => {
  if (req.path.startsWith("/admin")) return next();

  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/google",
    "/auth/google/callback",
  ];
  const isPublicPath = publicPaths.some(
    (path) =>
      req.path === path ||
      req.path.startsWith("/signup/") ||
      req.path.startsWith("/auth/"),
  );

  if (isPublicPath) return next();

  if (req.session && req.session.userId) {
    try {
      const user = await userService.findUserById(req.session.userId);

      if (!user || user.isBlocked) {
        return req.session.destroy(() => {
          res.clearCookie("papyrus.user.sid");

          if (req.xhr || req.headers.accept?.includes("json")) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              message:
                user && user.isBlocked
                  ? MESSAGES.CUSTOM
                      .YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_SUPPORT
                  : MESSAGES.AUTH.SESSION_EXPIRED,
              redirectUrl: "/login",
              blocked: true,
            });
          }

          return res.redirect(
            "/login?error=" +
              encodeURIComponent(
                user && user.isBlocked ? "blocked" : "session_expired",
              ),
          );
        });
      }
    } catch (error) {}
  }

  next();
});
app.use("/admin", (req, res, next) => {
  if (req.session && req.session.adminId && req.session.lastActivity) {
    const timeDiff = Date.now() - new Date(req.session.lastActivity).getTime();
    const maxInactivity = 1000 * 60 * 15;
    if (timeDiff > maxInactivity) {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.admin.sid");
        if (req.xhr || req.headers.accept?.includes("json")) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: "Admin session expired.",
            redirectUrl: "/admin/signin",
          });
        }
        return res.redirect("/admin/signin?error=timeout");
      });
    }
    req.session.lastActivity = new Date();
  }
  next();
});
export const preventUserFromAdminRoutes = (req, res, next) => {
  next();
};
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");
app.set("views", "./Views");
app.set("view cache", false);
app.use(express.static("public"));
app.use(secureHeaders);
registerCurrencyHelpers(app);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
app.use(setUserLocals);
app.use("/admin", preventUserFromAdminRoutes, adminRoutes);
app.use("/admin/referrals", preventUserFromAdminRoutes, adminReferralRoutes);
app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/referrals", referralRoutes);
app.use((req, res) => {
  const isAjax = req.xhr || req.headers.accept?.includes("application/json");
  if (isAjax) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: MESSAGES.CUSTOM.THE_PAGE_YOU_RE_LOOKING_FOR_DOESN_T_EXIST,
    });
  }
  res.redirect(
    "/?error=The page you're looking for doesn't exist. It might have been moved or deleted.",
  );
});
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: "File too large",
          message: "Maximum file size exceeded.",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: "Too many files",
          message: "Too many files uploaded.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: "Unexpected field",
          message: "File field name not allowed.",
        });
      default:
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ error: "Upload error", message: err.message });
    }
  }
  console.error("Server Error:", err);
  const isAjax = req.xhr || req.headers.accept?.includes("application/json");
  if (isAjax) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message:
        MESSAGES.CUSTOM
          .SERVER_ERROR_OCCURRED_OUR_TEAM_HAS_BEEN_NOTIFIED_AND_IS_WORKING_ON_IT,
    });
  }
  const redirectUrl =
    req.path.startsWith("/shop") || req.path.startsWith("/admin")
      ? req.path.startsWith("/admin")
        ? "/admin/signin"
        : "/shop"
      : "/home";
  res.redirect(
    `${redirectUrl}?error=A server error occurred. Our team has been notified and we're working on it.`,
  );
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Papyrus server is running on http://localhost:${PORT}/`);
});
