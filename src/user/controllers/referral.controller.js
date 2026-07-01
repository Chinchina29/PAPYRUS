import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as referralService from "../../shared/services/referral.service.js";

export const getReferralPage = async (req, res) => {
  try {
    res.render("user/referrals", {
      currentPage_name: "referrals",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect("/home?error=Unable to load referrals page");
  }
};

export const getReferralStats = async (req, res) => {
  try {
    const userId = req.session.userId;
    const stats = await referralService.getReferralStats(userId);
    
    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};

export const getReferralHistory = async (req, res) => {
  try {
    const userId = req.session.userId;
    const history = await referralService.getReferralHistory(userId);
    
    return res.json({
      success: true,
      history,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};

export const regenerateReferralCode = async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await referralService.regenerateReferralCode(userId);
    
    return res.json(result);
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};
