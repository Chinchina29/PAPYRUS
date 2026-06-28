import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as authService from "../services/auth.service.js";
import {
  successResponse,
  errorResponse,
  redirectResponse,
} from "../../shared/helpers/response.helper.js";
export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    const signupData = {
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      email: email?.trim(),
      password,
      confirmPassword,
    };
    const result = await authService.signupUser(signupData);
    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: result.message,
        errorType: result.errorType || "SIGNUP_FAILED",
      });
    }
    req.session.tempUserId = result.user._id.toString();
    req.session.tempUserEmail = result.user.email;
    return res.json({
      success: true,
      message: result.message,
      redirectUrl: "/signup/verify-otp",
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.SERVER_ERROR_OCCURRED_PLEASE_TRY_AGAIN_LATER,
      errorType: "SERVER_ERROR",
    });
  }
};
export const verifyOTP = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    const result = await authService.verifyUserOTP(
      req.session.tempUserId,
      otpCode,
    );
    if (!result.success) return errorResponse(res, result.message);
    req.session.userId = result.user._id.toString();
    req.session.user = {
      id: result.user._id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      role: result.user.role,
    };
    req.session.isNewUser = !result.user.hasSelectedGenres;
    delete req.session.tempUserId;
    delete req.session.tempUserEmail;
    return redirectResponse(res, result.message, "/home");
  } catch (error) {
    return errorResponse(res, "Server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
export const resendOTP = async (req, res) => {
  try {
    const result = await authService.resendUserOTP(req.session.tempUserId);
    if (!result.success) return errorResponse(res, result.message);
    return successResponse(res, result.message, { expiresIn: 600 });
  } catch (error) {
    return errorResponse(res, "Server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email?.trim(), password);
    if (!result.success) {
      if (result.needsVerification) {
        req.session.tempUserId = result.userId.toString();
        req.session.tempUserEmail = email?.trim();
        return res.json({
          success: true,
          message: result.message,
          redirectUrl: "/signup/verify-otp",
        });
      }
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: result.message,
        errorType: result.errorType || "LOGIN_FAILED",
      });
    }
    if (result.user.role === "admin") {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_USE_THE_ADMIN_LOGIN_PAGE,
        errorType: "ADMIN_LOGIN_REQUIRED",
      });
    }
    if (result.user.isBlocked) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.CUSTOM.YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_SUPPORT,
        errorType: "ACCOUNT_BLOCKED",
      });
    }
    req.session.userId = result.user._id.toString();
    req.session.user = {
      id: result.user._id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      role: result.user.role,
    };
    req.session.lastActivity = new Date();
    return res.json({
      success: true,
      message: result.message,
      redirectUrl: "/home",
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.SERVER_ERROR_OCCURRED_PLEASE_TRY_AGAIN_LATER,
      errorType: "SERVER_ERROR",
    });
  }
};
export const logout = (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  const isAjax = req.xhr || req.headers.accept?.includes("application/json");
  req.session.destroy((err) => {
    res.clearCookie("papyrus.user.sid");
    if (isAjax) {
      return res.json({
        success: true,
        message: MESSAGES.CUSTOM.LOGGED_OUT_SUCCESSFULLY,
        redirectUrl: "/",
      });
    }
    return res.redirect("/");
  });
};
export const saveGenrePreferences = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { genres } = req.body;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_LOG_IN_TO_CONTINUE,
      });
    }
    if (!genres || !Array.isArray(genres) || genres.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_SELECT_AT_LEAST_ONE_GENRE,
      });
    }
    const User = (await import("../../shared/models/User.js")).default;
    const Category = (await import("../../shared/models/Category.js")).default;
    const categories = await Category.find({ _id: { $in: genres } }).select(
      "name",
    );
    const genreNames = categories.map((cat) => cat.name);
    await User.findByIdAndUpdate(userId, {
      favoriteGenres: genreNames,
      hasSelectedGenres: true,
    });
    req.session.isNewUser = false;
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.PREFERENCES_SAVED_SUCCESSFULLY,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_SAVE_PREFERENCES,
    });
  }
};
export const skipGenreSelection = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_LOG_IN_TO_CONTINUE,
      });
    }
    const User = (await import("../../shared/models/User.js")).default;
    await User.findByIdAndUpdate(userId, {
      hasSelectedGenres: true,
    });
    req.session.isNewUser = false;
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.SKIPPED_GENRE_SELECTION,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_SKIP,
    });
  }
};
