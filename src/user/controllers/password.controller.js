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
      return errorResponse(res, "Email address is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return errorResponse(res, "Please enter a valid email address");
    }

    const user = await userService.findUserByEmail(trimmedEmail);
    if (!user) {
      return successResponse(res, "If email exists, reset code has been sent");
    }

    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      return res.status(429).json({ success: false, message: throttle.reason });
    }

    const otp = otpService.setOTP(user);
    await user.save();

    const emailResult = await emailService.sendPasswordResetOTP(
      user.email,
      user.firstName,
      otp,
    );
    if (!emailResult.success) {
      return errorResponse(res, "Failed to send reset code", 500);
    }

    req.session.resetEmail = trimmedEmail;
    return redirectResponse(
      res,
      "Reset code sent to your email",
      "/forgot-password/verify",
    );
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const verifyResetOTP = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;

    const email = req.session.resetEmail;
    if (!email) return errorResponse(res, "Session expired. Please start over");

    const user = await userService.findUserByEmail(email);
    if (!user) return errorResponse(res, "User not found", 404);

    const result = otpService.verifyUserOTP(user, otpCode);
    if (!result.success) return errorResponse(res, result.message);

    await user.save();
    req.session.resetVerified = true;
    return redirectResponse(
      res,
      "OTP verified successfully",
      "/forgot-password/reset",
    );
  } catch (error) {
    return errorResponse(res, "Server error", 500);
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
    if (!user) return errorResponse(res, "User not found", 404);

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
    return errorResponse(res, "Server error", 500);
  }
};

export const resendResetOTP = async (req, res) => {
  try {
    const email = req.session.resetEmail;
    if (!email) return errorResponse(res, "Session expired. Please start over");

    const user = await userService.findUserByEmail(email);
    if (!user) return errorResponse(res, "User not found", 404);

    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      return res.status(429).json({ success: false, message: throttle.reason });
    }

    const otp = otpService.setOTP(user);
    await user.save();

    const emailResult = await emailService.sendPasswordResetOTP(
      user.email,
      user.firstName,
      otp,
    );
    if (!emailResult.success)
      return errorResponse(res, "Failed to send OTP", 500);

    return successResponse(res, "New OTP sent to your email", {
      expiresIn: 600,
    });
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    if (!userId) return errorResponse(res, "Please login first", 401);

    const user = await userService.findUserById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    const isCurrentPasswordValid = await userService.comparePassword(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid)
      return errorResponse(res, "Current password is incorrect");

    user.password = newPassword;
    await user.save();

    return successResponse(res, "Password changed successfully");
  } catch (error) {
    return errorResponse(res, "Server error", 500);
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
      return res.status(400).json({
        success: false,
        message: "Session expired. Please login with Google again.",
        redirectUrl: "/login",
      });
    }

    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Both fields are required",
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
    const user = await userService.findUserById(req.session.tempGoogleUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please login with Google again.",
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
        return res.status(500).json({
          success: false,
          message: "Session error. Please try again.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Password set successfully! Welcome to Papyrus!",
        redirectUrl: "/home",
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to set password. Please try again or contact support if the issue persists.",
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
