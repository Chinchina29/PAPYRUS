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

const requiredEnvVars = ["MONGODB_URI", "SESSION_SECRET"];
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

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    name: "papyrus.sid",
    resave: true,
    saveUninitialized: false,
    rolling: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
      collectionName: "sessions",
      stringify: false,
      autoRemove: "native",
      autoRemoveInterval: 10,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  }),
);

app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    req.session.lastActivity = new Date();
    
    if (req.session.user && req.session.user.role === 'admin') {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 12;
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 4;
    }
  }
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith('/admin/')) {
    return next();
  }
  
  if (req.session && req.session.userId && req.session.lastActivity) {
    const now = new Date();
    const lastActivity = new Date(req.session.lastActivity);
    const timeDiff = now - lastActivity;
    const maxInactivity = req.session.user?.role === 'admin' ? 
      1000 * 60 * 60 * 2 : 1000 * 60 * 30;

    if (timeDiff > maxInactivity) {
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
      });

      if (req.xhr || req.headers.accept?.indexOf("json") > -1) {
        return res.status(401).json({
          success: false,
          message: "Session expired due to inactivity. Please login again.",
          redirectUrl: "/login",
        });
      }
      return res.redirect("/login?error=timeout");
    }
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

  if (req.session && req.session.userId) {
    res.set("X-Session-Active", "true");
    res.set("Vary", "Cookie, User-Agent");
  }

  next();
});

app.use(setUserLocals);

app.use("/", authRoutes);
app.use("/profile", profileRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).render("error/404");
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).render("error/500", { error: err });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});