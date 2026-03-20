import * as userService from "../../services/user.service.js";
import { errorResponse } from "../../helper/response.helper.js";

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await userService.findUserByEmail(email);

    if (!user || user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account is blocked. Contact support.",
      });
    }

    const isMatch = await userService.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin credentials",
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
    const stats = {
      totalUsers: (await userService.getTotalUsers()) || 0,
      activeUsers: (await userService.getActiveUsers()) || 0,
      blockedUsers: (await userService.getBlockedUsers()) || 0,
      newUsersToday: 5,
      revenue: 45231,
      orders: 1234,
      revenueGrowth: 15,
      ordersGrowth: 23,
    };

    const recentUsers = await userService.getRecentUsers(3);

    res.render("admin/dashboard", {
      user: req.session.adminUser,
      stats,
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

    res.render("admin/userdetail", {
      adminUser: req.session.adminUser,
      user,
    });
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

  req.session.destroy((err) => {
    if (err) return errorResponse(res, "Error logging out", 500);
    res.clearCookie("papyrus.admin.sid");
    res.redirect("/admin/logged-out");
  });
};
