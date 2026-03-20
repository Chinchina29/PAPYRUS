import express from "express";
import * as adminController from "../controller/admin/admin.controller.js";
import {
  isAdmin,
  isAdminNotAuthenticated,
  blockUserFromAdmin,
  noCache,
} from "../Middlewares/admin.middleware.js";

const router = express.Router();

router.use(noCache);

router.get("/signin", isAdminNotAuthenticated, (req, res) => {
  res.render("admin/adminsignin", {
    error: req.query.error || null,
  });
});

router.post("/signin", isAdminNotAuthenticated, adminController.signin);

router.get("/logged-out", (req, res) => {
  res.render("admin/loggedout");
});

router.get(
  "/dashboard",
  blockUserFromAdmin,
  isAdmin,
  adminController.dashboard,
);

router.get(
  "/users",
  blockUserFromAdmin,
  isAdmin,
  adminController.getUserManagement,
);

router.get(
  "/users/:userId",
  blockUserFromAdmin,
  isAdmin,
  adminController.getUserDetail,
);

router.post(
  "/users/block-unblock",
  blockUserFromAdmin,
  isAdmin,
  adminController.blockUnblockUser,
);

router.get("/logout", adminController.logout);

export default router;
