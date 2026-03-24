export const googleCallback = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login?error=oauth_failed");

    const user = req.user;

    if (user.role === "admin") {
      req.logout((err) => {
        if (err) console.error(err);
      });
      return res.redirect("/login?error=admin_oauth");
    }

    if (user.isBlocked) {
      req.logout((err) => {
        if (err) console.error(err);
      });
      return res.redirect("/login?error=blocked");
    }

    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
    req.session.lastActivity = new Date();

    req.session.save((err) => {
      if (err) return res.redirect("/login?error=session");
      return res.redirect("/home");
    });
  } catch (error) {
    console.error("Google callback error:", error);
    return res.redirect("/login?error=oauth_failed");
  }
};
