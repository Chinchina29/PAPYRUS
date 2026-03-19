import express from 'express';
import * as adminController from '../controller/admin/admin.controller.js';
import { isAdmin, isAdminNotAuthenticated, blockUserFromAdmin } from '../Middlewares/admin.middleware.js';

const router = express.Router();

router.use(blockUserFromAdmin);

router.get('/signin', isAdminNotAuthenticated, (req, res) => {
    res.render('admin/adminsignin', {
        error: req.query.error || null
    });
});

router.post('/signin', isAdminNotAuthenticated, adminController.signin);

router.get('/dashboard', isAdmin, adminController.dashboard);

router.get('/users', isAdmin, adminController.getUserManagement);

router.get('/users/:userId', isAdmin, adminController.getUserDetail);

router.post('/users/block-unblock', isAdmin, adminController.blockUnblockUser);

router.get('/logout', adminController.logout);

export default router;
