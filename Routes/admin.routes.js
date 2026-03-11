import express from 'express';
import * as adminController from '../controller/admin/admin.controller.js';
import { isAdmin, isAdminNotAuthenticated } from '../Middlewares/admin.middleware.js';

const router = express.Router();

router.get('/signin', isAdminNotAuthenticated, (req, res) => {
    res.render('admin/adminsignin');
});

router.post('/signin', adminController.signin);

router.get('/dashboard', isAdmin, adminController.dashboard);

router.get('/users', isAdmin, adminController.getUserManagement);

router.post('/users/block-unblock', isAdmin, adminController.blockUnblockUser);

router.get('/logout', adminController.logout);

export default router;
