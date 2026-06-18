import MongoStore from "connect-mongo";
import "dotenv/config";
export const userSessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: "user_sessions",
  touchAfter: 24 * 3600,
  stringify: false,
  autoRemove: "native",
});
export const adminSessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: "admin_sessions",
  touchAfter: 24 * 3600,
  stringify: false,
  autoRemove: "native",
});