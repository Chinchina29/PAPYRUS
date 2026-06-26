import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import bcrypt from "bcrypt";
import * as userService from "../../shared/services/user.service.js";
import * as otpService from "../../shared/services/otp.service.js";
import * as emailService from "../../shared/services/email.service.js";
import {
  successResponse,
  errorResponse,
  redirectResponse,
} from "../../shared/helpers/response.helper.js";
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email?.trim();
    if (!trimmedEmail) {
      return errorResponse(res, MESSAGES.CUSTOM.EMAIL_ADDRESS_IS_REQUIRED);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return errorResponse(res, MESSAGES.CUSTOM.PLEASE_ENTER_A_VALID_EMAIL_ADDRESS);
    }
    const user = await userService.findUserByEmail(trimmedEmail);
    if (!user) {
      return successResponse(res, "If email exists, reset code has been sent");
    }
    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ success: false, message: throttle.reason });
    }
    const otp = otpService.setOTP(user);
    await user.save();
    const emailResult = await emailService.sendPasswordResetOTP(
      user.email,
      user.firstName,
      otp,
    );
    if (!emailResult.success) {
      return errorResponse(res, "Failed to send reset code", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    req.session.resetEmail = trimmedEmail;
    return redirectResponse(
      res,
      "Reset code sent to your email",
      "/forgot-password/verify",
    );
  } catch (error) {
    return errorResponse(res, "Server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
export const verifyResetOTP = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    const email = req.session.resetEmail;
    if (!email) return errorResponse(res, MESSAGES.CUSTOM.SESSION_EXPIRED_PLEASE_START_OVER_1);
    const user = await userService.findUserByEmail(email);
    if (!user) return errorResponse(res, MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    const result = otpService.verifyUserOTP(user, otpCode);
    if (!result.success) return errorResponse(res, result.message);
    await user.save();
    req.session.resetVerified = true;
    return redirectResponse(
      res,
      MESSAGES.AUTH.OTP_VERIFIED,
      "/forgot-password/reset",
    );
  } catch (error) {
    return errorResponse(res, "Server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const email = req.session.resetEmail;
    const verified = req.session.resetVerified;
    if (!email || !verified) {
      return errorResponse(
        res,
        "Unauthorized. Please complete verification first",
      );
    }
    const user = await userService.findUserByEmail(email);
    if (!user) return errorResponse(res, MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    user.password = newPassword;
    otpService.clearOTP(user);
    await user.save();
    delete req.session.resetEmail;
    delete req.session.resetVerified;
    return redirectResponse(
      res,
      "Password reset successful! You can now login",
      "/login",
    );
  } catch (error) {
    return errorResponse(res, "Server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
export const resendResetOTP = async (req, res) => {
  try {
    const email = req.session.resetEmail;
    if (!email) return errorResponse(res, MESSAGES.CUSTOM.SESSION_EXPIRED_PLEASE_START_OVER_1);
    const user = await userService.findUserByEmail(email);
    if (!user) return errorResponse(res, MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ success: false, message: throttle.reason });
    }
    const otp = otpService.setOTP(user);
    await user.save();
    const emailResult = await emailService.sendPasswordResetOTP(
      user.email,
      user.firstName,
      otp,
    );
    if (!emailResult.success)
      return errorResponse(res, "Failed to send OTP", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    return successResponse(res, "New OTP sent to your email", {
      expiresIn: 600,
    });
  } catch (error) {
    return errorResponse(res, "Server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    if (!userId) return errorResponse(res, "Please login first", HTTP_STATUS.UNAUTHORIZED);
    const user = await userService.findUserById(userId);
    if (!user) return errorResponse(res, MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    const isCurrentPasswordValid = await userService.comparePassword(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid)
      return errorResponse(res, MESSAGES.CUSTOM.CURRENT_PASSWORD_IS_INCORRECT);
    user.password = newPassword;
    await user.save();
    return successResponse(res, MESSAGES.AUTH.PASSWORD_CHANGED);
  } catch (error) {
    return errorResponse(res, "Server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
export const showSetPassword = (req, res) => {
  if (!req.session.tempGoogleUserId) {
    return res.redirect("/login");
  }
  res.render("user/setpassword", {
    email: req.session.tempGoogleEmail,
    name: req.session.tempGoogleName,
  });
};
export const setGooglePassword = async (req, res) => {
  try {
    if (!req.session.tempGoogleUserId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.SESSION_EXPIRED_PLEASE_LOGIN_WITH_GOOGLE_AGAIN,
        redirectUrl: "/login",
      });
    }
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.BOTH_FIELDS_ARE_REQUIRED,
      });
    }
    if (password !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.VALIDATION.PASSWORD_MISMATCH,
      });
    }
    if (password.length < 6) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PASSWORD_MUST_BE_AT_LEAST_6_CHARACTERS,
      });
    }
    const user = await userService.findUserById(req.session.tempGoogleUserId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CUSTOM.USER_NOT_FOUND_PLEASE_LOGIN_WITH_GOOGLE_AGAIN,
        redirectUrl: "/login",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    delete req.session.tempGoogleUserId;
    delete req.session.tempGoogleEmail;
    delete req.session.tempGoogleName;
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
    req.session.lastActivity = new Date();
    req.session.save((err) => {
      if (err) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: MESSAGES.CUSTOM.SESSION_ERROR_PLEASE_TRY_AGAIN,
        });
      }
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: MESSAGES.CUSTOM.PASSWORD_SET_SUCCESSFULLY_WELCOME_TO_PAPYRUS,
        redirectUrl: "/home",
      });
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_SET_PASSWORD_PLEASE_TRY_AGAIN_OR_CONTACT_SUPPORT_IF_THE_ISSUE_PERSISTS,
    });
  }
};
export const skipSetPassword = async (req, res) => {
  try {
    if (!req.session.tempGoogleUserId) {
      return res.redirect("/login");
    }
    const user = await userService.findUserById(req.session.tempGoogleUserId);
    if (!user) return res.redirect("/login");
    delete req.session.tempGoogleUserId;
    delete req.session.tempGoogleEmail;
    delete req.session.tempGoogleName;
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
    req.session.lastActivity = new Date();
    req.session.save((err) => {
      if (err) return res.redirect("/login?error=session");
      return res.redirect("/home");
    });
  } catch (error) {
    return res.redirect("/login?error=oauth_failed");
  }
};