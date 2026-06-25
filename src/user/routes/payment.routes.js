import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { ensureAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/create-order', ensureAuthenticated, paymentController.createPaymentOrder);
router.post('/verify', ensureAuthenticated, paymentController.verifyPayment);
router.post('/failure', ensureAuthenticated, paymentController.handlePaymentFailure);
router.get('/success', paymentController.getPaymentSuccess);
router.get('/failure', paymentController.getPaymentFailure);

export default router;