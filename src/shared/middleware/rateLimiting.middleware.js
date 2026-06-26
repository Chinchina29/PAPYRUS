import rateLimit from "express-rate-limit";
const isDevelopment = process.env.NODE_ENV !== "production";
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 5,
  message: {
    success: false,
    message:
      "Too many authentication attempts, please try again in 15 minutes.",
  },
  skipSuccessfulRequests: true,
});
export const emailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 30 : 3,
  message: {
    success: false,
    message:
      "Too many email requests, please wait a minute before trying again.",
  },
});
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 100 : 10,
  message: {
    success: false,
    message: "Too many upload requests, please wait a minute.",
  },
});
export const cartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 300 : 30,
  message: {
    success: false,
    message: "Too many cart operations, please slow down.",
  },
});
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 500 : 50,
  message: {
    success: false,
    message: "Too many search requests, please wait a moment.",
  },
});
export const createCustomLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max: isDevelopment ? max * 10 : max,
    message: {
      success: false,
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
