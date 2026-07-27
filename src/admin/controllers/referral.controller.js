import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as referralService from "../../shared/services/referral.service.js";

export const getReferralStats = async (req, res) => {
  try {
    const stats = await referralService.getAdminReferralStats();
    
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.json({ success: true, title: "Referral Analytics", stats });
    }
    res.render("admin/dashboard", {
      title: "Referral Analytics",
      currentPage_name: "dashboard",
      user: req.session.adminUser,
      stats,
    });
  } catch (error) {
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.INTERNAL_ERROR });
    }
    res.redirect("/admin/dashboard?error=" + encodeURIComponent("Failed to load referral stats"));
  }
};

export const getAllReferrals = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const referrals = await referralService.getAllReferrals(search, status);
    
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.json({ success: true, title: "Referral Management", referrals, search, status });
    }
    res.render("admin/dashboard", {
      title: "Referral Management",
      currentPage_name: "dashboard",
      user: req.session.adminUser,
      referrals,
      search,
      status,
    });
  } catch (error) {
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.INTERNAL_ERROR });
    }
    res.redirect("/admin/dashboard?error=" + encodeURIComponent("Failed to load referrals"));
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
