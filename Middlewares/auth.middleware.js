import * as userService from "../services/user.service.js";

export const setUserLocals = async (req, res, next) => {
  if (req.path.startsWith("/admin")) return next();

  if (req.session && req.session.userId) {
    try {
      const user = await userService.findUserById(req.session.userId);

      if (!user) {
        req.session.destroy();
        return redirectToLogin(req, res, "User not found");
      }

      if (user.isBlocked) {
        req.session.destroy();
        return redirectToLogin(req, res, "Account blocked");
      }
      if (user.role === "admin") {
        req.session.destroy();
        return redirectToLogin(req, res, "Please use admin login");
      }

      req.session.user = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      };

      res.locals.user = req.session.user;
    } catch (error) {
      console.error("Auth middleware error:", error);
      req.session.destroy();
      return redirectToLogin(req, res, "Authentication error");
    }
  }
  next();
};

export const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return redirectToLogin(req, res, "Authentication required");
  }
  next();
};

export const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/home");
  }
  next();
};

export const requireUserRole = (req, res, next) => {
  if (req.session && req.session.userId && req.session.user?.role === "admin") {
    return res.status(403).render("error/403", {
      message: "Access denied. This area is for regular users only.",
    });
  }
  next();
};

function redirectToLogin(req, res, message) {
  if (req.xhr || req.headers.accept?.includes("json")) {
    return res.status(401).json({
      success: false,
      message,
      redirectUrl: "/login",
    });
  }
  const returnTo = req.originalUrl;
  if (returnTo && returnTo !== "/login" && returnTo !== "/signup") {
    req.session.returnTo = returnTo;
  }
  return res.redirect("/login");
}

export const preventConcurrentAdminSessions = async (req, res, next) => next();
