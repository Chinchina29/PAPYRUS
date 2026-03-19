import * as userService from "../services/user.service.js";

export const setUserLocals = async (req, res, next) => {
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
    if (req.session.user && req.session.user.role === "admin") {
      return res.redirect("/admin/dashboard");
    }
    return res.redirect("/home");
  }
  next();
};

function redirectToLogin(req, res, message) {
  if (req.xhr || req.headers.accept?.indexOf("json") > -1) {
    return res.status(401).json({
      success: false,
      message: message,
      redirectUrl: "/login",
    });
  }
  const returnTo = req.originalUrl;
  if (returnTo && returnTo !== "/login" && returnTo !== "/signup") {
    req.session.returnTo = returnTo;
  }
  return res.redirect("/login");
}

export const requireUserRole = (req, res, next) => {
  if (
    req.session &&
    req.session.userId &&
    req.session.user &&
    req.session.user.role === "admin"
  ) {
    return res.status(403).render("error/403", {
      message: "Access denied. This area is for regular users only.",
    });
  }
  next();
};

export const preventConcurrentAdminSessions = async (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    console.log(
      `Admin session active: ${req.session.user.email} from ${req.ip}`,
    );
  }
  next();
};
