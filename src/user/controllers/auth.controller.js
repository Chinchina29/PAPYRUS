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
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      referralCode,
    } = req.body;
    const signupData = {
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      email: email?.trim(),
      password,
      confirmPassword,
      referralCode: referralCode?.trim(),
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
    const { otp1, otp2, otp3, otp4, otp5, otp6, email } = req.body;
    const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    let tempUserId = req.session.tempUserId;
    if (!tempUserId) {
      const searchEmail = req.session.tempUserEmail || email;
      if (searchEmail) {
        const user = await userService.findUserByEmail(searchEmail);
        if (user) {
          tempUserId = user._id.toString();
          req.session.tempUserId = tempUserId;
        }
      }
    }
    if (!tempUserId) {
      return errorResponse(res, "Session expired. Please sign up or request a new OTP.");
    }
    const result = await authService.verifyUserOTP(
      tempUserId,
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
    return errorResponse(
      res,
      "Server error",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
export const resendOTP = async (req, res) => {
  try {
    const result = await authService.resendUserOTP(req.session.tempUserId);
    if (!result.success) return errorResponse(res, result.message);
    return successResponse(res, result.message, { expiresIn: 600 });
  } catch (error) {
    return errorResponse(
      res,
      "Server error",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
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
        message:
          MESSAGES.CUSTOM.YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_SUPPORT,
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

    const result = await authService.saveUserGenrePreferences(userId, genres);

    if (!result.success) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: result.message,
      });
    }

    req.session.isNewUser = false;

    return res.json({
      success: true,
      message: result.message,
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

    const result = await authService.skipUserGenreSelection(userId);

    if (!result.success) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: result.message,
      });
    }

    req.session.isNewUser = false;

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_SKIP,
    });
  }
};

export const getLandingPage = async (req, res) => {
  try {
    if (req.session && req.session.userId) {
      return res.redirect("/home");
    }

    const result = await authService.getLandingPageProducts();

    return res.render("user/home-landing", {
      user: null,
      recommendedProducts: result.products,
    });
  } catch (error) {
    console.error("Error loading landing page:", error);
    return res.render("user/home-landing", {
      user: null,
      recommendedProducts: [],
    });
  }
};

export const getHomePage = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.redirect("/");
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const isNewUser = req.session.isNewUser || false;

    const result = await authService.getHomePageData(isNewUser);

    return res.render("user/home", {
      user: req.session.user,
      isNewUser,
      categories: result.data.categories,
      recommendedProducts: result.data.recommendedProducts,
      topSellers: result.data.topSellers,
      featuredCollections: result.data.featuredCollections,
      recentStories: result.data.recentStories,
    });
  } catch (error) {
    console.error("Error loading home page:", error);
    return res.render("user/home", {
      user: req.session.user,
      isNewUser: false,
      categories: [],
      recommendedProducts: [],
      topSellers: [],
      featuredCollections: [],
      recentStories: [],
    });
  }
};

export const getSignupPage = (req, res) => {
  const referralCode = req.query.ref || "";
  return res.render("user/signup", { referralCode });
};

export const getVerifyOtpPage = (req, res) => {
  if (!req.session.tempUserId) {
    return res.redirect("/signup");
  }
  return res.render("user/verifyotp", {
    email: req.session.tempUserEmail,
    type: "signup",
  });
};

export const getLoginPage = (req, res) => {
  return res.render("user/login");
};

export const getForgotPasswordPage = (req, res) => {
  return res.render("user/forgotpassword");
};

export const getForgotPasswordVerifyPage = (req, res) => {
  if (!req.session.resetEmail) {
    return res.redirect("/forgot-password");
  }
  return res.render("user/verifyotp", {
    email: req.session.resetEmail,
    type: "reset",
  });
};

export const getForgotPasswordResetPage = (req, res) => {
  if (!req.session.resetEmail || !req.session.resetVerified) {
    return res.redirect("/forgot-password");
  }
  return res.render("user/resetpassword");
};
