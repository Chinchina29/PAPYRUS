import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as referralService from "../../shared/services/referral.service.js";

export const getReferralStats = async (req, res) => {
  try {
    const stats = await referralService.getAdminReferralStats();
    
    res.render("admin/referral-stats", {
      title: "Referral Analytics",
      stats,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("admin/error", {
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};

export const getAllReferrals = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const referrals = await referralService.getAllReferrals(search, status);
    
    res.render("admin/referrals", {
      title: "Referral Management",
      referrals,
      search,
      status,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("admin/error", {
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};

export const getApiReferralStats = async (req, res) => {
  try {
    const stats = await referralService.getAdminReferralStats();
    
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

export const getApiAllReferrals = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const referrals = await referralService.getAllReferrals(search, status);
    
    return res.json({
      success: true,
      referrals,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};
