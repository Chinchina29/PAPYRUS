import express from 'express';
import * as adminController from '../controller/admin/admin.controller.js';
import { isAdmin, isAdminNotAuthenticated } from '../Middlewares/admin.middleware.js';

const router = express.Router();

router.get('/signin', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/adminsignin');
});

router.post('/signin', (req, res) => {
    console.log('🔥 ADMIN SIGNIN ROUTE HIT!');
    console.log('Body:', req.body);
    adminController.signin(req, res);
});

router.get('/dashboard', isAdmin, adminController.dashboard);

router.get('/users', isAdmin, adminController.getUserManagement);

router.post('/users/block-unblock', isAdmin, adminController.blockUnblockUser);

router.get('/logout', adminController.logout);

export default router;
