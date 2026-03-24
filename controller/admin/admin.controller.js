import * as userService from "../../services/user.service.js";
import * as otpService from "../../services/otp.service.js";
import * as emailService from "../../services/email.service.js";
import { errorResponse } from "../../helper/response.helper.js";

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await userService.findUserByEmail(email);

    if (!user || user.role !== "admin") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid admin credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account is blocked. Contact support.",
      });
    }

    const isMatch = await userService.comparePassword(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid admin credentials" });
    }

    req.session.adminId = user._id.toString();
    req.session.adminUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
    req.session.lastActivity = new Date();

    req.session.save((err) => {
      if (err) {
        console.error("Admin session save error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Session error" });
      }
      return res.json({
        success: true,
        message: "Login successful",
        redirect: "/admin/dashboard",
      });
    });
  } catch (error) {
    console.error("Admin signin error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const dashboard = async (req, res) => {
  try {
    const stats = await userService.getDashboardStats();
    const recentUsers = await userService.getRecentUsers(5);

    res.render("admin/dashboard", {
      user: req.session.adminUser || req.adminUser,
      stats: {
        totalUsers: stats.totalUsers || 0,
        activeUsers: stats.activeUsers || 0,
        blockedUsers: stats.blockedUsers || 0,
        newUsersToday: stats.newUsersToday || 0,
        revenue: 42850,
        orders: 1234,
        revenueGrowth: 12.5,
        ordersGrowth: 8.2,
      },
      recentUsers: recentUsers || [],
      recentOrders: [
        {
          title: "The Great Gatsby",
          customer: "John Doe",
          price: 299,
          time: "2 min ago",
        },
        {
          title: "To Kill a Mockingbird",
          customer: "Jane Smith",
          price: 399,
          time: "5 min ago",
        },
        {
          title: "1984",
          customer: "Mike Johnson",
          price: 349,
          time: "10 min ago",
        },
      ],
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).render("error/500", { error: "Dashboard loading failed" });
  }
};

export const getUserManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "";

    const result = await userService.getAllUsers(page, limit, search, status);

    res.render("admin/usermanagement", {
      user: req.session.adminUser,
      users: result.users,
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.total,
      search,
      status,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).send("Server error");
  }
};

export const blockUnblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const user = await userService.toggleBlockUser(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: user.isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
      data: { isBlocked: user.isBlocked },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
};

export const getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res
        .status(400)
        .render("error/404", { message: "User ID is required" });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).render("error/404", { message: "User not found" });
    }

    res.render("admin/userdetail", { adminUser: req.session.adminUser, user });
  } catch (error) {
    console.error("Get user detail error:", error);
    res
      .status(500)
      .render("error/500", { error: "Failed to load user details" });
  }
};

export const logout = (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  const isAjax = req.xhr || req.headers.accept?.includes("application/json");

  if (!req.session) {
    res.clearCookie("papyrus.admin.sid");
    if (isAjax) {
      return res.json({ success: true, redirectUrl: "/admin/signin" });
    }
    return res.redirect("/admin/signin");
  }

  req.session.destroy((err) => {
    res.clearCookie("papyrus.admin.sid");

    if (err) {
      console.error("Admin logout error:", err);
    }

    if (isAjax) {
      return res.json({ success: true, redirectUrl: "/admin/signin" });
    }
    return res.redirect("/admin/signin");
  });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await userService.findUserByEmail(email);

    if (!user || user.role !== "admin") {
      return res.json({
        success: true,
        message: "If that email exists, a reset code has been sent.",
      });
    }

    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      const statusCode = throttle.type === "lockout" ? 423 : 429; // 423 = Locked, 429 = Too Many Requests
      return res.status(statusCode).json({
        success: false,
        message: throttle.reason,
        type: throttle.type,
        secondsLeft: throttle.secondsLeft,
        minutesLeft: throttle.minutesLeft,
      });
    }

    const otp = otpService.setOTP(user);
    await user.save();

    const emailResult = await emailService.sendPasswordResetOTP(
      user.email,
      user.firstName,
      otp,
    );
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send reset code. Please try again.",
      });
    }

    req.session.adminResetEmail = email;

    return res.json({
      success: true,
      message: "Reset code sent to your email.",
      redirectUrl: "/admin/forgot-password/verify",
    });
  } catch (error) {
    console.error("Admin forgot password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const verifyForgotOTP = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;

    const email = req.session.adminResetEmail;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please start over.",
      });
    }

    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const result = otpService.verifyUserOTP(user, otpCode);
    if (!result.success) {
      await user.save();

      const statusCode =
        result.type === "lockout" || result.type === "locked" ? 423 : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        type: result.type,
        attemptsLeft: result.attemptsLeft,
      });
    }

    await user.save();
    req.session.adminResetVerified = true;

    return res.json({
      success: true,
      message: "OTP verified successfully.",
      redirectUrl: "/admin/forgot-password/reset",
    });
  } catch (error) {
    console.error("Admin verify forgot OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resendForgotOTP = async (req, res) => {
  try {
    const email = req.session.adminResetEmail;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please start over.",
      });
    }

    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
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
      return res
        .status(500)
        .json({ success: false, message: "Failed to resend OTP." });
    }

    return res.json({
      success: true,
      message: "New OTP sent to your email.",
      expiresIn: 600,
    });
  } catch (error) {
    console.error("Admin resend forgot OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    const email = req.session.adminResetEmail;
    const verified = req.session.adminResetVerified;

    if (!email || !verified) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please complete verification first.",
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match." });
    }

    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.password = newPassword;
    otpService.clearOTP(user);
    await user.save();

    delete req.session.adminResetEmail;
    delete req.session.adminResetVerified;

    return res.json({
      success: true,
      message: "Password reset successful! You can now login.",
      redirectUrl: "/admin/signin",
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
