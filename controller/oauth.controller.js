export const googleCallback = (req, res) => {
  req.session.useerId = req.user._id.toString();
  req.session.user = {
    id: req.user._id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
  };
  res.redirect("/home");
};

export const facebookCallback = (req, res) => {
  req.session.userId = req.user._id.toString();
  req.session.user = {
    id: req.user._id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
  };
  res.redirect("/home");
};
export const authFailure = (req, res) => {
  res.redirect("/login?error=Authentication failed");
};
