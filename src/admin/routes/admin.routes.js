import express from "express";
import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import * as adminController from "../controllers/admin.controller.js";
import * as categoryController from "../controllers/category.controller.js";
import * as productController from "../controllers/product.controller.js";
import * as submissionController from "../controllers/submission.controller.js";
import * as orderController from "../controllers/order.controller.js";
import * as couponController from "../controllers/coupon.controller.js";
import * as walletController from "../controllers/wallet.controller.js";
import * as reportController from "../controllers/report.controller.js";
import { migrateUserGenres } from "../../shared/utils/migrateGenres.js";
import {
  isAdmin,
  isAdminNotAuthenticated,
  blockUserFromAdmin,
  preventUserFromAdminRoutes,
  noCache,
} from "../middleware/admin.middleware.js";
import {
  adminLoginValidation,
  validate,
} from "../../shared/middleware/validation.middleware.js";
import { 
  authLimiter, 
  generalApiLimiter 
} from "../../shared/middleware/rateLimiting.middleware.js";
const router = express.Router();
router.use(noCache);
router.use(preventUserFromAdminRoutes);
router.get("/migrate-genres", blockUserFromAdmin, isAdmin, async (req, res) => {
  try {
    const result = await migrateUserGenres();
    res.json(result);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
  }
});
router.get("/signin", isAdminNotAuthenticated, (req, res) => {
  res.render("admin/adminsignin", { error: req.query.error || null });
});
router.post("/signin", authLimiter, isAdminNotAuthenticated, adminController.signin);
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
router.get("/orders", blockUserFromAdmin, isAdmin, orderController.getOrders);
router.get("/return-requests", blockUserFromAdmin, isAdmin, orderController.getReturnRequests);
router.get("/orders/:id", blockUserFromAdmin, isAdmin, orderController.getOrderDetail);
router.get("/orders/:id/invoice", blockUserFromAdmin, isAdmin, orderController.downloadInvoice);
router.patch("/orders/:id/status", blockUserFromAdmin, isAdmin, generalApiLimiter, orderController.updateOrderStatus);
router.patch("/orders/:id/payment", blockUserFromAdmin, isAdmin, generalApiLimiter, orderController.updatePaymentStatus);
router.post("/orders/:id/cancel", blockUserFromAdmin, isAdmin, generalApiLimiter, orderController.cancelOrder);
router.post("/orders/:id/return/approve", blockUserFromAdmin, isAdmin, generalApiLimiter, orderController.approveReturnRequest);
router.post("/orders/:id/return/reject", blockUserFromAdmin, isAdmin, generalApiLimiter, orderController.rejectReturnRequest);
router.post("/orders/:orderId/items/:itemId/return/approve", blockUserFromAdmin, isAdmin, generalApiLimiter, orderController.approveItemReturn);
router.post("/orders/:orderId/items/:itemId/return/reject", blockUserFromAdmin, isAdmin, generalApiLimiter, orderController.rejectItemReturn);
router.get("/wallet", blockUserFromAdmin, isAdmin, walletController.getWalletLedger);
router.get("/wallet/export-csv", blockUserFromAdmin, isAdmin, walletController.exportWalletCSV);
router.get("/wallet/transaction/:id", blockUserFromAdmin, isAdmin, walletController.getTransactionDetails);
router.get("/reports", blockUserFromAdmin, isAdmin, reportController.getSalesReport);
router.get("/reports/download/pdf", blockUserFromAdmin, isAdmin, reportController.downloadPdfReport);
router.get("/reports/download/excel", blockUserFromAdmin, isAdmin, reportController.downloadExcelReport);
router.get("/coupons", blockUserFromAdmin, isAdmin, couponController.getCoupons);
router.get("/coupons/add", blockUserFromAdmin, isAdmin, couponController.getAddCoupon);
router.post("/coupons/add", blockUserFromAdmin, isAdmin, generalApiLimiter, couponController.addCoupon);
router.get("/coupons/edit/:id", blockUserFromAdmin, isAdmin, couponController.getEditCoupon);
router.post("/coupons/edit/:id", blockUserFromAdmin, isAdmin, generalApiLimiter, couponController.editCoupon);
router.delete("/coupons/delete/:id", blockUserFromAdmin, isAdmin, generalApiLimiter, couponController.deleteCoupon);
router.patch("/coupons/toggle/:id", blockUserFromAdmin, isAdmin, generalApiLimiter, couponController.toggleCoupon);
router.post("/coupons/validate", generalApiLimiter, couponController.validateCoupon);
router.get("/settings", blockUserFromAdmin, isAdmin, (req, res) => {
  res.render("admin/settings", { 
    currentPage_name: "settings", 
    user: req.session.adminUser 
  });
});
router.get("/support", blockUserFromAdmin, isAdmin, (req, res) => {
  res.render("admin/support", { 
    currentPage_name: "support", 
    user: req.session.adminUser 
  });
});
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
  "/categories/:parentId/subcategories",
  blockUserFromAdmin,
  isAdmin,
  categoryController.getSubcategories,
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
router.get(
  "/submissions",
  blockUserFromAdmin,
  isAdmin,
  submissionController.getSubmissions,
);
router.get(
  "/submissions/:id",
  blockUserFromAdmin,
  isAdmin,
  submissionController.getSubmissionDetail,
);
router.post(
  "/submissions/:id/review",
  blockUserFromAdmin,
  isAdmin,
  generalApiLimiter,
  submissionController.reviewSubmission,
);
router.patch(
  "/submissions/:id/review",
  blockUserFromAdmin,
  isAdmin,
  generalApiLimiter,
  submissionController.reviewSubmission,
);
export default router;
