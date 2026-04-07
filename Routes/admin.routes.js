import express from "express";
import * as adminController from "../controller/admin/admin.controller.js";
import * as categoryController from "../controller/admin/category.controller.js";
import * as productController from "../controller/admin/product.controller.js";
import {
  isAdmin,
  isAdminNotAuthenticated,
  blockUserFromAdmin,
  preventUserFromAdminRoutes,
  noCache,
} from "../Middlewares/admin.middleware.js";
import { requireRole } from "../Middlewares/auth.middleware.js";
const router = express.Router();

router.use(noCache);

router.use(preventUserFromAdminRoutes);

router.get("/signin", isAdminNotAuthenticated, (req, res) => {
  res.render("admin/adminsignin", { error: req.query.error || null });
});
router.post("/signin", isAdminNotAuthenticated, adminController.signin);

router.get("/forgot-password", isAdminNotAuthenticated, (req, res) => {
  res.render("admin/adminforgotpassword");
});
router.post("/forgot-password/send", adminController.forgotPassword);

router.get("/forgot-password/verify", (req, res) => {
  if (!req.session.adminResetEmail)
    return res.redirect("/admin/forgot-password");
  res.render("admin/adminverifyotp", { email: req.session.adminResetEmail });
});
router.post("/forgot-password/verify", adminController.verifyForgotOTP);
router.post("/forgot-password/resend", adminController.resendForgotOTP);

router.get("/forgot-password/reset", (req, res) => {
  if (!req.session.adminResetEmail || !req.session.adminResetVerified)
    return res.redirect("/admin/forgot-password");
  res.render("admin/adminresetpassword");
});
router.post("/forgot-password/reset", adminController.resetPassword);

router.get("/logout", adminController.logout);
router.post("/logout", adminController.logout);

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
router.get(
  "/categories",
  blockUserFromAdmin,
  isAdmin,
  categoryController.getCategories,
);

router.get(
  "/categories/add",
  blockUserFromAdmin,
  isAdmin,
  categoryController.getAddCategory,
);

router.post(
  "/categories/add",
  blockUserFromAdmin,
  isAdmin,
  categoryController.addCategory,
);

router.get(
  "/categories/edit/:id",
  blockUserFromAdmin,
  isAdmin,
  categoryController.getEditCategory,
);

router.post(
  "/categories/edit/:id",
  blockUserFromAdmin,
  isAdmin,
  categoryController.editCategory,
);

router.delete(
  "/categories/delete/:id",
  blockUserFromAdmin,
  isAdmin,
  categoryController.deleteCategory,
);

router.patch(
  "/categories/toggle/:id",
  blockUserFromAdmin,
  isAdmin,
  categoryController.toggleCategory,
);

router.get(
  "/products",
  blockUserFromAdmin,
  isAdmin,
  productController.getProducts,
);

router.get(
  "/products/add",
  blockUserFromAdmin,
  isAdmin,
  productController.getAddProduct,
);

router.post(
  "/products/add",
  blockUserFromAdmin,
  isAdmin,
  productController.addProduct,
);

router.get(
  "/products/edit/:id",
  blockUserFromAdmin,
  isAdmin,
  productController.getEditProduct,
);

router.post(
  "/products/edit/:id",
  blockUserFromAdmin,
  isAdmin,
  productController.editProduct,
);

router.delete(
  "/products/delete/:id",
  blockUserFromAdmin,
  isAdmin,
  productController.deleteProduct,
);

router.patch(
  "/products/toggle/:id",
  blockUserFromAdmin,
  isAdmin,
  productController.toggleProduct,
);

export default router;
