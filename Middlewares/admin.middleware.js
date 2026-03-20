import * as userService from "../services/user.service.js";

export const isAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.adminId) {
      return res.redirect("/admin/signin?error=auth");
    }

    const user = await userService.findUserById(req.session.adminId);

    if (!user) {
      req.session.destroy();
      return res.redirect("/admin/signin?error=user");
    }

    if (user.role !== "admin") {
      req.session.destroy();
      return res.status(403).render("error/403", {
        message: "Access denied. Admin privileges required.",
      });
    }

    if (user.isBlocked) {
      req.session.destroy();
      return res.redirect("/admin/signin?error=blocked");
    }

    if (req.session.lastActivity) {
      const timeDiff =
        Date.now() - new Date(req.session.lastActivity).getTime();
      if (timeDiff > 1000 * 60 * 15) {
        req.session.destroy();
        return res.redirect("/admin/signin?error=timeout");
      }
    }

    req.session.adminUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
    req.session.lastActivity = new Date();
    req.adminUser = user;
    next();
  } catch (error) {
    console.error("isAdmin error:", error);
    return res.status(500).render("error/500", {
      message: "Authentication error. Please try again.",
    });
  }
};

export const isAdminNotAuthenticated = async (req, res, next) => {
  try {
    if (!req.session || !req.session.adminId) {
      return next();
    }

    const user = await userService.findUserById(req.session.adminId);

    if (!user || user.role !== "admin") {
      req.session.destroy();
      return next();
    }

    return res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("isAdminNotAuthenticated error:", error);
    return next();
  }
};
export const blockUserFromAdmin = (req, res, next) => {
  const isAjax =
    req.get("X-Requested-With") === "XMLHttpRequest" ||
    req.get("Content-Type") === "application/json";

  if (
    req.session &&
    req.session.adminId &&
    req.session.adminUser &&
    req.session.adminUser.role === "user"
  ) {
    if (isAjax) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrators only.",
      });
    }
    return res.status(403).render("error/403", {
      message: "Access denied. This area is restricted to administrators only.",
    });
  }
  next();
};
export const noCache = (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
};
