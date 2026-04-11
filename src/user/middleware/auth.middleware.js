import * as userService from "../../shared/services/user.service.js";
import { adminSessionStore } from "../../shared/config/session.config.js";

export const isAuthenticated = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(401).json({
        success: false,
        message: "Please login",
        redirectUrl: "/login",
      });
    }
    return res.redirect("/login");
  }

  try {
    const user = await userService.findUserById(req.session.userId);

    if (!user) {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.user.sid");
        return res.redirect("/login");
      });
    }

    if (user.isBlocked) {
      return req.session.destroy(() => {
        res.clearCookie("papyrus.user.sid");
        if (req.xhr || req.headers.accept?.includes("application/json")) {
          return res.status(403).json({
            success: false,
            message: "Account blocked",
            redirectUrl: "/login?error=blocked",
          });
        }
        return res.redirect("/login?error=blocked");
      });
    }

    next();
  } catch (error) {
    return res.redirect("/login");
  }
};

export const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/home");
  }
  next();
};

export const setUserLocals = (req, res, next) => {
  res.locals.user = req.session?.user || null;
  res.locals.adminUser = req.session?.adminUser || null;
  res.locals.isLoggedIn = !!req.session?.userId;
  next();
};

export const requireUserRole = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
        redirectUrl: "/login",
      });
    }
    return res.redirect("/login");
  }

  if (req.session.user && req.session.user.role !== "user") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  next();
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect("/login");
    }

    const userRole = req.session.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).redirect("/unauthorized");
    }

    next();
  };
};

export const preventLoginIfAdminActive = (req, res, next) => {
  const adminSid = req.cookies?.["papyrus.admin.sid"];

  if (!adminSid) return next();
  const rawSid = adminSid.startsWith("s:")
    ? decodeURIComponent(adminSid.slice(2).split(".")[0])
    : adminSid;

  adminSessionStore.get(rawSid, (err, adminSession) => {
    if (err || !adminSession || !adminSession.adminId) {
      return next();
    }
    const isAjax =
      req.xhr ||
      req.get("X-Requested-With") === "XMLHttpRequest" ||
      req.headers.accept?.includes("application/json");

    if (isAjax) {
      return res.status(403).json({
        success: false,
        message: "An admin session is active. Please logout as admin first.",
        redirectUrl: "/admin/dashboard",
      });
    }

    return res.redirect("/admin/dashboard");
  });
};
