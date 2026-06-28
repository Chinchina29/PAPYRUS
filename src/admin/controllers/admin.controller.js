import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as userService from "../../shared/services/user.service.js";
import * as otpService from "../../shared/services/otp.service.js";
import * as emailService from "../../shared/services/email.service.js";
import * as orderService from "../../shared/services/order.service.js";
import Order from "../../shared/models/Order.js";
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.EMAIL_AND_PASSWORD_ARE_REQUIRED,
      });
    }
    const user = await userService.findUserByEmail(email);
    if (!user || user.role !== "admin") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.INVALID_ADMIN_CREDENTIALS,
      });
    }
    if (user.isBlocked) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.CUSTOM.ACCOUNT_IS_BLOCKED_CONTACT_SUPPORT,
      });
    }
    const isMatch = await userService.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.INVALID_ADMIN_CREDENTIALS,
      });
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
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: MESSAGES.CUSTOM.SESSION_ERROR,
        });
      }
      return res.json({
        success: true,
        message: MESSAGES.AUTH.LOGIN_SUCCESS,
        redirect: "/admin/dashboard",
      });
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.SERVER_ERROR,
    });
  }
};
export const dashboard = async (req, res) => {
  try {
    let stats = {};
    let recentUsers = [];
    let revenue = 0;
    let totalOrders = 0;
    let recentOrders = [];
    let bestSellingProducts = [];
    let bestSellingCategories = [];
    let bestSellingBrands = [];

    try {
      stats = await userService.getDashboardStats();
      recentUsers = await userService.getRecentUsers(5);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);

      const deliveredOrders = await Order.find({
        orderStatus: "Delivered",
        createdAt: { $gte: lastMonth },
      });

      revenue = deliveredOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0,
      );
      totalOrders = await Order.countDocuments();

      recentOrders = await Order.find()
        .populate("user", "firstName lastName")
        .populate("items.product", "title")
        .sort({ createdAt: -1 })
        .limit(5);

      recentOrders = recentOrders.map((order) => {
        const firstItem = order.items[0];
        return {
          title: firstItem?.title || "N/A",
          customer: order.user
            ? `${order.user.firstName} ${order.user.lastName}`
            : "Guest",
          price: order.totalAmount || 0,
          time: getTimeAgo(order.createdAt),
        };
      });

      bestSellingProducts = await Order.aggregate([
        { $match: { orderStatus: { $ne: "Cancelled" } } },
        { $unwind: "$items" },
        {
          $match: {
            "items.status": "Available",
            "items.itemStatus": { $nin: ["Cancelled", "Returned"] },
          },
        },
        {
          $group: {
            _id: "$items.product",
            title: { $first: "$items.title" },
            totalQty: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.subtotal" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
        { $sort: { totalQty: -1 } },
        { $limit: 10 },
      ]);

      bestSellingCategories = await Order.aggregate([
        { $match: { orderStatus: { $ne: "Cancelled" } } },
        { $unwind: "$items" },
        {
          $match: {
            "items.status": "Available",
            "items.itemStatus": { $nin: ["Cancelled", "Returned"] },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$productInfo.category",
            totalQty: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.subtotal" },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        {
          $project: {
            categoryName: "$categoryInfo.name",
            totalQty: 1,
            totalRevenue: 1,
          },
        },
        { $sort: { totalQty: -1 } },
        { $limit: 10 },
      ]);

      bestSellingBrands = await Order.aggregate([
        { $match: { orderStatus: { $ne: "Cancelled" } } },
        { $unwind: "$items" },
        {
          $match: {
            "items.status": "Available",
            "items.itemStatus": { $nin: ["Cancelled", "Returned"] },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$productInfo.brand",
            totalQty: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.subtotal" },
          },
        },
        { $match: { _id: { $ne: null, $ne: "" } } },
        { $sort: { totalQty: -1 } },
        { $limit: 10 },
      ]);
    } catch (serviceError) {
      console.error("Dashboard stats error:", serviceError);
      stats = {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        newUsersToday: 0,
      };
    }

    res.render("admin/dashboard", {
      user: req.session.adminUser || req.adminUser,
      currentPage_name: "dashboard",
      stats: {
        totalUsers: stats.totalUsers || 0,
        activeUsers: stats.activeUsers || 0,
        blockedUsers: stats.blockedUsers || 0,
        newUsersToday: stats.newUsersToday || 0,
        revenue: revenue,
        orders: totalOrders,
        revenueGrowth: 0,
        ordersGrowth: 0,
      },
      recentUsers: recentUsers || [],
      recentOrders: recentOrders,
      bestSellingProducts,
      bestSellingCategories,
      bestSellingBrands,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .render("error/500", { error: "Dashboard loading failed" });
  }
};

export const getChartData = async (req, res) => {
  try {
    const filter = req.query.filter || "monthly";
    const now = new Date();
    let labels = [];
    let data = [];

    if (filter === "weekly") {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyData = await Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "Cancelled" },
            createdAt: { $gte: startOfWeek },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]);

      const weeklyMap = {};
      weeklyData.forEach((item) => {
        weeklyMap[item._id] = item.revenue;
      });

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const yyyymmdd = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
        });
        labels.push(label);
        data.push(weeklyMap[yyyymmdd] || 0);
      }
    } else if (filter === "yearly") {
      const startOfFiveYearsAgo = new Date(now.getFullYear() - 4, 0, 1);

      const yearlyData = await Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "Cancelled" },
            createdAt: { $gte: startOfFiveYearsAgo },
          },
        },
        {
          $group: {
            _id: { $year: "$createdAt" },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]);

      const yearlyMap = {};
      yearlyData.forEach((item) => {
        yearlyMap[item._id] = item.revenue;
      });

      const currentYear = now.getFullYear();
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i;
        labels.push(year.toString());
        data.push(yearlyMap[year] || 0);
      }
    } else {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

      const monthlyData = await Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "Cancelled" },
            createdAt: { $gte: startOfYear, $lt: endOfYear },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]);

      const monthlyMap = {};
      monthlyData.forEach((item) => {
        monthlyMap[item._id] = item.revenue;
      });

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      for (let i = 0; i < 12; i++) {
        labels.push(months[i]);
        data.push(monthlyMap[i + 1] || 0);
      }
    }

    return res.json({ success: true, labels, data });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: error.message });
  }
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
export const getUserManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const result = await userService.getAllUsers(page, limit, search, status);
    res.render("admin/usermanagement", {
      user: req.session.adminUser,
      currentPage_name: "users",
      users: result.users,
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.total,
      search,
      status,
    });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .render("error/500", { error: "Failed to load users" });
  }
};
export const blockUnblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.USER_ID_IS_REQUIRED,
      });
    }
    const user = await userService.toggleBlockUser(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER.NOT_FOUND,
      });
    }
    return res.json({
      success: true,
      message: user.isBlocked ? MESSAGES.USER.BLOCKED : MESSAGES.USER.UNBLOCKED,
      data: { isBlocked: user.isBlocked },
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.SERVER_ERROR_1 + error.message,
    });
  }
};
export const getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).render("error/404", {
        message: MESSAGES.CUSTOM.USER_ID_IS_REQUIRED,
      });
    }
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).render("error/404", {
        message: MESSAGES.USER.NOT_FOUND,
      });
    }
    res.render("admin/userdetail", {
      adminUser: req.session.adminUser,
      currentPage_name: "users",
      user,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error/500", {
      error: "Failed to load user details",
    });
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
    if (isAjax) {
      return res.json({ success: true, redirectUrl: "/admin/signin" });
    }
    return res.redirect("/admin/signin");
  });
};
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email?.trim();
    if (!trimmedEmail) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.EMAIL_IS_REQUIRED,
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_ENTER_A_VALID_EMAIL_ADDRESS,
      });
    }
    const user = await userService.findUserByEmail(trimmedEmail);
    if (!user || user.role !== "admin") {
      return res.json({
        success: true,
        message:
          MESSAGES.CUSTOM.IF_THAT_EMAIL_EXISTS_A_RESET_CODE_HAS_BEEN_SENT,
      });
    }
    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      const statusCode = throttle.type === "lockout" ? 423 : 429;
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_SEND_RESET_CODE_PLEASE_TRY_AGAIN,
      });
    }
    req.session.adminResetEmail = trimmedEmail;
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.RESET_CODE_SENT_TO_YOUR_EMAIL,
      redirectUrl: "/admin/forgot-password/verify",
    });
  } catch (error) {
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.CUSTOM.SERVER_ERROR });
  }
};
export const verifyForgotOTP = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    const email = req.session.adminResetEmail;
    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.SESSION_EXPIRED_PLEASE_START_OVER,
      });
    }
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CUSTOM.USER_NOT_FOUND,
      });
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
      message: MESSAGES.CUSTOM.OTP_VERIFIED_SUCCESSFULLY,
      redirectUrl: "/admin/forgot-password/reset",
    });
  } catch (error) {
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.CUSTOM.SERVER_ERROR });
  }
};
export const resendForgotOTP = async (req, res) => {
  try {
    const email = req.session.adminResetEmail;
    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.SESSION_EXPIRED_PLEASE_START_OVER,
      });
    }
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CUSTOM.USER_NOT_FOUND,
      });
    }
    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: throttle.reason,
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_RESEND_OTP,
      });
    }
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.NEW_OTP_SENT_TO_YOUR_EMAIL,
      expiresIn: 600,
    });
  } catch (error) {
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.CUSTOM.SERVER_ERROR });
  }
};
export const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.adminResetEmail;
    const verified = req.session.adminResetVerified;
    if (!email || !verified) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message:
          MESSAGES.CUSTOM.UNAUTHORIZED_PLEASE_COMPLETE_VERIFICATION_FIRST,
      });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PASSWORD_MUST_BE_AT_LEAST_8_CHARACTERS,
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PASSWORDS_DO_NOT_MATCH,
      });
    }
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CUSTOM.USER_NOT_FOUND,
      });
    }
    user.password = newPassword;
    otpService.clearOTP(user);
    await user.save();
    delete req.session.adminResetEmail;
    delete req.session.adminResetVerified;
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.PASSWORD_RESET_SUCCESSFUL_YOU_CAN_NOW_LOGIN,
      redirectUrl: "/admin/signin",
    });
  } catch (error) {
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.CUSTOM.SERVER_ERROR });
  }
};
