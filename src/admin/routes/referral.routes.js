import express from "express";
import * as referralController from "../controllers/referral.controller.js";
import { isAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();

router.get("/stats", isAdmin, referralController.getReferralStats);
router.get("/list", isAdmin, referralController.getAllReferrals);
router.get("/api/stats", isAdmin, referralController.getApiReferralStats);
router.get("/api/list", isAdmin, referralController.getApiAllReferrals);

export default router;
