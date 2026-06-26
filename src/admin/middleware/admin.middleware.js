import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as userService from "../../shared/services/user.service.js";
export const isAdmin = async (req, res, next) => {
  try {
    const isAjax =
      req.xhr ||
      req.headers.accept?.includes("application/json") ||
      req.get("X-Requested-With") === "XMLHttpRequest";
    if (!req.session || !req.session.adminId) {
      if (isAjax) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: MESSAGES.CUSTOM.ADMIN_AUTHENTICATION_REQUIRED,
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
        return res.status(HTTP_STATUS.FORBIDDEN).render("error/403", {
          message: MESSAGES.ADMIN.ACCESS_DENIED,
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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error/500", {
      message: MESSAGES.CUSTOM.AUTHENTICATION_REQUIRED,
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
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.ADMIN.ACCESS_DENIED,
      });
    }
    return res.status(HTTP_STATUS.FORBIDDEN).render("error/403", {
      message: MESSAGES.ADMIN.ACCESS_DENIED,
    });
  }
  next();
};
export const preventUserFromAdminRoutes = (req, res, next) => {
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
  if (isPublicRoute) {
    return next();
  }
  if (!req.session.adminId) {
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
