import * as userService from "../services/user.service.js";

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
    console.error("isAuthenticated error:", error);
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
