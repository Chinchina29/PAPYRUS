import "dotenv/config";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import connectDB from "./config/mongo.config.js";
import passport from "./config/passport.config.js";
import { setUserLocals } from "./Middlewares/auth.middleware.js";

import authRoutes from "./Routes/auth.routes.js";
import profileRoutes from "./Routes/profile.routes.js";
import adminRoutes from "./Routes/admin.routes.js";

const requiredEnvVars = ['MONGODB_URI', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}

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

app.use("/", authRoutes);
app.use("/profile", profileRoutes);
app.use("/admin", adminRoutes);

console.log('Routes mounted successfully');

app.use((req, res) => {
    res.status(404).render("error/404");
});

app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).render("error/500", { error: err });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  
});
