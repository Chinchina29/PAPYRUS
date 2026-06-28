import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import User from "../../shared/models/User.js";
import * as userService from "../../shared/services/user.service.js";

export const getSettings = async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const admin = await User.findById(adminId).select('-password');
    
    res.render("admin/settings", {
      title: "Settings",
      admin,
      currentPage_name: "settings",
      user: req.session.adminUser,
      error: null,
      success: null,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("admin/settings", {
      title: "Settings",
      admin: null,
      currentPage_name: "settings",
      user: req.session.adminUser,
      error: MESSAGES.COMMON.INTERNAL_ERROR,
      success: null,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.VALIDATION.REQUIRED_FIELDS,
      });
    }

    const admin = await User.findByIdAndUpdate(
      adminId,
      { firstName, lastName, email },
      { returnDocument: 'after' }
    );

    req.session.adminUser = {
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
    };

    res.json({
      success: true,
      message: MESSAGES.USER.PROFILE_UPDATED,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.VALIDATION.REQUIRED_FIELDS,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.VALIDATION.PASSWORD_MISMATCH,
      });
    }

    if (newPassword.length < 8) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.VALIDATION.INVALID_PASSWORD,
      });
    }

    const admin = await User.findById(adminId);
    
    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER.NOT_FOUND,
      });
    }

    const isMatch = await userService.comparePassword(currentPassword, admin.password);

    if (!isMatch) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.CURRENT_PASSWORD_IS_INCORRECT,
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: MESSAGES.AUTH.PASSWORD_CHANGED,
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};
