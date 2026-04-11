import "dotenv/config";
import express from "express";
import multer from "multer";
import session from "express-session";
import cookieParser from "cookie-parser";
import connectDB from "./src/shared/config/mongo.config.js";
import passport from "./src/shared/config/passport.config.js";
import { setUserLocals } from "./src/user/middleware/auth.middleware.js";
import { secureHeaders } from "./src/shared/middleware/cache.middleware.js";
import { generalApiLimiter } from "./src/shared/middleware/rateLimiting.middleware.js";

import {
  userSessionStore,
  adminSessionStore,
} from "./src/shared/config/session.config.js";

import authRoutes from "./src/user/routes/auth.routes.js";
import userRoutes from "./src/user/routes/user.routes.js";
import adminRoutes from "./src/admin/routes/admin.routes.js";

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
          return res.status(401).json({
            success: false,
            message: "Session expired. Please login again.",
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

app.use("/admin", (req, res, next) => {
  if (req.session && req.session.adminId && req.session.lastActivity) {
    const timeDiff = Date.now() - new Date(req.session.lastActivity).getTime();
    const maxInactivity = 1000 * 60 * 15;

    if (timeDiff > maxInactivity) {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.admin.sid");
        if (req.xhr || req.headers.accept?.includes("json")) {
          return res.status(401).json({
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
  const userSid = req.cookies?.["papyrus.user.sid"];

  if (!userSid) return next();

  const rawSid = userSid.startsWith("s:")
    ? decodeURIComponent(userSid.slice(2).split(".")[0])
    : userSid;

  userSessionStore.get(rawSid, (err, userSession) => {
    if (err || !userSession) return next();

    if (userSession.userId && !userSession.adminId) {
      const isAjax =
        req.xhr ||
        req.get("X-Requested-With") === "XMLHttpRequest" ||
        req.headers.accept?.includes("application/json");

      if (isAjax) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Please login as admin.",
          redirectUrl: "/home",
        });
      }
      return res.redirect("/home");
    }

    next();
  });
};
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", "./Views");
app.use(express.static("public"));
app.use(secureHeaders);

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(setUserLocals);

app.use(generalApiLimiter);

app.use("/admin", preventUserFromAdminRoutes, adminRoutes);
app.use("/", authRoutes);
app.use("/", userRoutes);

app.use((req, res) => res.status(404).render("error/404"));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          error: "File too large",
          message: "Maximum file size exceeded.",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          error: "Too many files",
          message: "Too many files uploaded.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          error: "Unexpected field",
          message: "File field name not allowed.",
        });
      default:
        return res
          .status(400)
          .json({ error: "Upload error", message: err.message });
    }
  }
  res
    .status(500)
    .json({ error: "Internal server error", message: "Something went wrong." });
});

app.use((err, req, res, next) => {
  res.status(500).render("error/500", { error: err });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT);
