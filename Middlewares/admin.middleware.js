import * as userService from "../services/user.service.js";

export const isAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.redirect("/admin/signin?error=auth");
    }

    const user = await userService.findUserById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/admin/signin?error=user");
    }

    if (user.role !== "admin") {
      return res.status(403).render("error/403", {
        message: "Access denied. Admin privileges required.",
      });
    }

    if (user.isBlocked) {
      req.session.destroy();
      return res.redirect("/admin/signin?error=blocked");
    }

    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).render("error/500", {
      message: "Authentication system error. Please try again.",
    });
  }
};

export const isAdminNotAuthenticated = (req, res, next) => {
  if (
    req.session &&
    req.session.userId &&
    req.session.user &&
    req.session.user.role === "admin"
  ) {
    return res.redirect("/admin/dashboard");
  }
  next();
};

export const blockUserFromAdmin = (req, res, next) => {
  const isAjax =
    req.get("X-Requested-With") === "XMLHttpRequest" ||
    req.get("Content-Type") === "application/json";

  if (
    req.session &&
    req.session.userId &&
    req.session.user &&
    req.session.user.role === "user"
  ) {
    if (isAjax) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Access denied. This area is restricted to administrators only.",
        });
    }
    return res.status(403).render("error/403", {
      message: "Access denied. This area is restricted to administrators only.",
    });
  }
  next();
};

export const adminSessionTimeout = (req, res, next) => {
  const isAjax =
    req.get("X-Requested-With") === "XMLHttpRequest" ||
    req.get("Content-Type") === "application/json";

  if (req.session && req.session.isAdminSession && req.session.lastActivity) {
    const now = new Date();
    const lastActivity = new Date(req.session.lastActivity);
    const timeDiff = now - lastActivity;
    const maxAdminInactivity = 1000 * 60 * 15;

    if (timeDiff > maxAdminInactivity) {
      req.session.destroy((err) => {
        if (err) console.error("Admin session destroy error:", err);
      });
      if (isAjax) {
        return res
          .status(401)
          .json({ success: false, message: "Session timeout" });
      }
      return res.redirect("/admin/signin?error=timeout");
    }
  }
  next();
};
