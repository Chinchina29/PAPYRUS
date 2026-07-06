import express from "express";
import * as referralController from "../controllers/referral.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";

const router = express.Router();

// Referral page
router.get("/", isAuthenticated, referralController.getReferralPage);

// API endpoints
router.get("/stats", isAuthenticated, referralController.getReferralStats);
router.get("/history", isAuthenticated, referralController.getReferralHistory);
router.post("/regenerate", isAuthenticated, referralController.regenerateReferralCode);

export default router;
