import * as authService from "../../services/auth.service.js";
import {
  successResponse,
  errorResponse,
  redirectResponse,
} from "../../helper/response.helper.js";

export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const result = await authService.signupUser(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
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
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
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
    if (!result.success) {
      return errorResponse(res, result.message);
    }
    req.session.userId = result.user._id.toString();
    req.session.user = {
      id: result.user._id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      role: result.user.role,
    };
    delete req.session.tempUserId;
    delete req.session.tempUserEmail;

    return redirectResponse(res, result.message, "/home");
  } catch (error) {
    console.error("Verify OTP error :", error);
    return errorResponse(res, "Server error", 500);
  }
};

export const resendOTP = async (req, res) => {
  try {
    const result = await authService.resendUserOTP(req.session.tempUserId);
    if (!result.success) {
      return errorResponse(res, result.message);
    }
    return successResponse(res, result.message, { expiresIn: 600 });
  } catch (error) {
    console.error("Resend OTP error :", error);
    return errorResponse(res, "Server error", 500);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authService.loginUser(email, password);

    if (!result.success) {
      if (result.needsVerification) {
        req.session.tempUserId = result.userId.toString();
        req.session.tempUserEmail = email;
        return res.json({
          success: true,
          message: result.message,
          redirectUrl: "/signup/verify-otp",
        });
      }
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    if (result.user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
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

    const tabId = req.get("X-Tab-ID");
    if (tabId) {
      req.session.activeTabId = tabId;
    }

    return res.json({
      success: true,
      message: result.message,
      redirectUrl: "/home",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

export const logout = (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  req.session.destroy((err) => {
    if (err) {
      return errorResponse(res, "Error logging out", 500);
    }
    res.redirect("/login");
  });
};
