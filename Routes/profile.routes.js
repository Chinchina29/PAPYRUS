import express from 'express';
import * as profileController from '../controller/user/profile.controller.js';
import * as passwordController from '../controller/user/password.controller.js';
import * as addressController from '../controller/user/address.controller.js';
import { isAuthenticated } from '../Middlewares/auth.middleware.js';
import { changePasswordValidation, addressValidation, validate } from '../Middlewares/validation.middleware.js';

const router = express.Router();

router.get('/', isAuthenticated, profileController.showProfile);

router.get('/edit', isAuthenticated, profileController.showEditProfile);

router.post('/update', isAuthenticated, profileController.updateProfile);

router.post('/request-email-change', isAuthenticated, profileController.requestEmailChange);

router.post('/verify-email-change', isAuthenticated, profileController.verifyEmailChange);

router.post('/cancel-email-change', isAuthenticated, profileController.cancelEmailChange);

router.get('/change-password', isAuthenticated, profileController.showChangePassword);

router.post('/change-password', isAuthenticated, changePasswordValidation, validate, passwordController.changePassword);

router.get('/addresses', isAuthenticated, addressController.showAddresses);

router.get('/address/add', isAuthenticated, addressController.showAddAddress);

router.post('/address/add', isAuthenticated, addressValidation, validate, addressController.addAddress);

router.get('/address/edit/:id', isAuthenticated, addressController.showEditAddress);

router.post('/address/edit/:id', isAuthenticated, addressValidation, validate, addressController.updateAddress);

router.delete('/address/:id', isAuthenticated, addressController.deleteAddress);

router.post('/address/set-default/:id', isAuthenticated, addressController.setDefaultAddress);

export default router;
