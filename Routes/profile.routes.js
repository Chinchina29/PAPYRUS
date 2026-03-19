import express from "express";
import * as profileController from "../controller/user/profile.controller.js";
import * as passwordController from "../controller/user/password.controller.js";
import * as addressController from "../controller/user/address.controller.js";
import { upload } from "../config/cloudinary.config.js";

import {
  isAuthenticated,
  requireUserRole,
} from "../Middlewares/auth.middleware.js";
import {
  changePasswordValidation,
  addressValidation,
  validate,
} from "../Middlewares/validation.middleware.js";

const router = express.Router();
router.use((req, res, next) => {
  next();
});

router.use(requireUserRole);

router.get("/debug", isAuthenticated, (req, res) => {
  res.json({
    success: true,
    userId: req.session?.userId,
    user: req.session?.user,
    sessionId: req.sessionID,
  });
});

router.get("/", isAuthenticated, profileController.showProfile);

router.get("/edit", isAuthenticated, profileController.showEditProfile);

router.post("/update", isAuthenticated, profileController.updateProfile);
router.post(
  "/upload-avatar",
  isAuthenticated,
  upload.single("avatar"),
  profileController.uploadAvatar,
);

router.delete(
  "/profile-picture",
  isAuthenticated,
  profileController.removeProfilePicture,
);

router.post(
  "/request-email-change",
  isAuthenticated,
  profileController.requestEmailChange,
);

router.post(
  "/verify-email-change",
  isAuthenticated,
  profileController.verifyEmailChange,
);
router.post(
  "/resend-email-otp",
  isAuthenticated,
  profileController.resendEmailOTP,
);

router.post(
  "/cancel-email-change",
  isAuthenticated,
  profileController.cancelEmailChange,
);

router.get(
  "/change-password",
  isAuthenticated,
  profileController.showChangePassword,
);

router.post(
  "/change-password",
  isAuthenticated,
  changePasswordValidation,
  validate,
  passwordController.changePassword,
);

// router.get('/addresses', isAuthenticated, addressController.showAddresses);

// router.get('/addresses/list', isAuthenticated, addressController.getAddressesList);

// router.get('/address/add', isAuthenticated, addressController.showAddAddress);

// router.post('/address/add', isAuthenticated, addressValidation, validate, addressController.addAddress);

// router.post('/addresses', isAuthenticated, addressValidation, validate, addressController.addAddress);

// router.get('/address/edit/:id', isAuthenticated, addressController.showEditAddress);

// router.post('/address/edit/:id', isAuthenticated, addressValidation, validate, addressController.updateAddress);

// router.post('/addresses/:id', isAuthenticated, addressValidation, validate, addressController.updateAddress);

// router.delete('/address/:id', isAuthenticated, addressController.deleteAddress);

// router.delete('/addresses/:id', isAuthenticated, addressController.deleteAddress);

// router.post('/address/set-default/:id', isAuthenticated, addressController.setDefaultAddress);

// router.post('/addresses/:id/set-default', isAuthenticated, addressController.setDefaultAddress);
router.get("/addresses", isAuthenticated, addressController.showAddresses);
router.get(
  "/addresses/list",
  isAuthenticated,
  addressController.getAddressesList,
);
router.get("/addresses/add", isAuthenticated, addressController.showAddAddress);
router.post(
  "/addresses/add",
  isAuthenticated,
  addressValidation,
  validate,
  addressController.addAddress,
);
router.get(
  "/addresses/edit/:id",
  isAuthenticated,
  addressController.showEditAddress,
);
router.put(
  "/addresses/:id",
  isAuthenticated,
  addressValidation,
  validate,
  addressController.updateAddress,
);
router.delete(
  "/addresses/:id",
  isAuthenticated,
  addressController.deleteAddress,
);
router.post(
  "/addresses/:id/set-default",
  isAuthenticated,
  addressController.setDefaultAddress,
);

export default router;
