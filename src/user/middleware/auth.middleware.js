import * as userService from "../../shared/services/user.service.js";
export const isAuthenticated = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
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
    if (!user || user.isBlocked) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
          success: false,
          message: "Session invalid",
          redirectUrl: "/login",
        });
      }
      return res.redirect("/login");
    }
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    console.error('User authentication error:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        success: false,
        message: "Authentication error",
        redirectUrl: "/login",
      });
    }
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
  res.locals.isLoggedIn = !!(req.session?.userId);
  next();
};
export const requireUserRole = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
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
export const preventAdminFromUserAuth = (req, res, next) => {
  next();
};