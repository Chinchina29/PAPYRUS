import * as authService from "../services/auth.service.js";
import {
  successResponse,
  errorResponse,
  redirectResponse,
} from "../../shared/helpers/response.helper.js";

export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    
    const trimmedFirstName = firstName?.trim();
    const trimmedLastName = lastName?.trim();
    const trimmedEmail = email?.trim();
    
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email address" });
    }
    
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }
    
    const signupData = {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      password,
      confirmPassword
    };
    
    const result = await authService.signupUser(signupData);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    req.session.tempUserId = result.user._id.toString();
    req.session.tempUserEmail = result.user.email;
    return res.json({
      success: true,
      message: result.message,
      redirectUrl: "/signup/verify-otp",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
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
    return errorResponse(res, "Server error", 500);
  }
};

export const resendOTP = async (req, res) => {
  try {
    const result = await authService.resendUserOTP(req.session.tempUserId);
    if (!result.success) return errorResponse(res, result.message);
    return successResponse(res, result.message, { expiresIn: 600 });
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();
    
    if (!trimmedEmail || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email address" });
    }
    
    const result = await authService.loginUser(trimmedEmail, password);
    if (result.success) {
      if (result.needsVerification) {
        req.session.tempUserId = result.userId.toString();
        req.session.tempUserEmail = trimmedEmail;
        return res.json({
          success: true,
          message: result.message,
          redirectUrl: "/signup/verify-otp",
        });
      }
      return res.status(400).json({ success: false, message: result.message });
    }
    if (result.user.role === "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Please use the admin login page." });
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
    req.session.lastActivity = new Date();
    return res.json({
      success: true,
      message: result.message,
      redirectUrl: "/home",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
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
        message: "Logged out successfully",
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
      return res.status(401).json({
        success: false,
        message: "Please log in to continue",
      });
    }

    if (!genres || !Array.isArray(genres) || genres.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one genre",
      });
    }

    const User = (await import("../../shared/models/User.js")).default;
    const Category = (await import("../../shared/models/Category.js")).default;
    
    const categories = await Category.find({ _id: { $in: genres } }).select('name');
    const genreNames = categories.map(cat => cat.name);

    await User.findByIdAndUpdate(userId, {
      favoriteGenres: genreNames,
      hasSelectedGenres: true,
    });

    req.session.isNewUser = false;

    return res.json({
      success: true,
      message: "Preferences saved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save preferences",
    });
  }
};

export const skipGenreSelection = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue",
      });
    }

    const User = (await import("../../shared/models/User.js")).default;
    
    await User.findByIdAndUpdate(userId, {
      hasSelectedGenres: true,
    });

    req.session.isNewUser = false;

    return res.json({
      success: true,
      message: "Skipped genre selection",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to skip",
    });
  }
};
