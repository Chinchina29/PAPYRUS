import * as userService from "../../shared/services/user.service.js";

export const isAdmin = async (req, res, next) => {
  try {
    const isAjax =
      req.xhr ||
      req.headers.accept?.includes("application/json") ||
      req.get("X-Requested-With") === "XMLHttpRequest";

    if (!req.session || !req.session.adminId) {
      if (isAjax) {
        return res.status(401).json({
          success: false,
          message: "Admin authentication required.",
          redirectUrl: "/admin/signin",
        });
      }
      return res.redirect("/admin/signin?error=auth");
    }

    const user = await userService.findUserById(req.session.adminId);

    if (!user) {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.admin.sid");
        return res.redirect("/admin/signin?error=user");
      });
    }

    if (user.role !== "admin") {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.admin.sid");
        return res.status(403).render("error/403", {
          message: "Access denied. Admin privileges required.",
        });
      });
    }

    if (user.isBlocked) {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.admin.sid");
        return res.redirect("/admin/signin?error=blocked");
      });
    }

    if (req.session.lastActivity) {
      const timeDiff =
        Date.now() - new Date(req.session.lastActivity).getTime();
      if (timeDiff > 1000 * 60 * 15) {
        return req.session.destroy(() => {
          res.clearCookie("papyrus.admin.sid");
          return res.redirect("/admin/signin?error=timeout");
        });
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
      return req.session.destroy(() => {
        res.clearCookie("papyrus.admin.sid");
        return next();
      });
    }
    return res.redirect("/admin/dashboard");
  } catch (error) {
    return next();
  }
};

export const blockUserFromAdmin = (req, res, next) => {
  const isAjax =
    req.xhr ||
    req.get("X-Requested-With") === "XMLHttpRequest" ||
    req.headers.accept?.includes("application/json");

  if (
    req.session &&
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

export const preventUserFromAdminRoutes = (req, res, next) => {
  if (req.session && req.session.userId && !req.session.adminId) {
    const isAjax =
      req.xhr ||
      req.get("X-Requested-With") === "XMLHttpRequest" ||
      req.headers.accept?.includes("application/json");

    if (isAjax) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Please login as admin.",
        redirectUrl: "/home",
      });
    }
    return res.redirect("/home");
  }

  const publicAdminRoutes = [
    "/admin/signin",
    "/admin/forgot-password",
    "/admin/forgot-password/send",
    "/admin/forgot-password/verify",
    "/admin/forgot-password/resend",
    "/admin/forgot-password/reset",
  ];

  const isPublicRoute = publicAdminRoutes.some(
    (route) => req.path === route.replace("/admin", ""),
  );

  if (!isPublicRoute && !req.session.adminId) {
    return res.redirect("/admin/signin");
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
