import "dotenv/config";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import connectDB from "./config/mongo.config.js";
import passport from "./config/passport.config.js";
import { setUserLocals } from "./Middlewares/auth.middleware.js";
import { secureHeaders } from "./Middlewares/cache.middleware.js";

import authRoutes from "./Routes/auth.routes.js";
import profileRoutes from "./Routes/profile.routes.js";
import adminRoutes from "./Routes/admin.routes.js";

const requiredEnvVars = [
  "MONGODB_URI",
  "SESSION_SECRET",
  "ADMIN_SESSION_SECRET",
];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", "),
  );
  process.exit(1);
}

const app = express();
connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const userSession = session({
  secret: process.env.SESSION_SECRET,
  name: "papyrus.user.sid",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "user_sessions",
    touchAfter: 24 * 3600,
    stringify: false,
    autoRemove: "native",
  }),
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
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "admin_sessions",
    touchAfter: 24 * 3600,
    stringify: false,
    autoRemove: "native",
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

app.use("/admin", adminSession);
app.use("/", userSession);

app.use((req, res, next) => {
  if (req.path.startsWith("/admin")) return next();

  if (req.session && req.session.userId && req.session.lastActivity) {
    const timeDiff = Date.now() - new Date(req.session.lastActivity).getTime();
    const maxInactivity = 1000 * 60 * 30;

    if (timeDiff > maxInactivity) {
      return req.session.destroy(() => {
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

app.use("/admin", adminRoutes);
app.use("/", authRoutes);
app.use("/profile", profileRoutes);

app.use((req, res) => res.status(404).render("error/404"));
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).render("error/500", { error: err });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
