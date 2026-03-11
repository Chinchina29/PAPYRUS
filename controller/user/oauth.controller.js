export const googleCallback = (req, res) => {
  console.log('✅ Google OAuth successful!');
  console.log('👤 User data:', {
    id: req.user._id,
    name: req.user.firstName + ' ' + req.user.lastName,
    email: req.user.email,
    googleId: req.user.googleId
  });
  
  req.session.userId = req.user._id.toString();
  req.session.user = {
    id: req.user._id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
    role: req.user.role
  };
  
  console.log('🎯 Redirecting to /home');
  res.redirect("/home");
};

export const authFailure = (req, res) => {
  res.redirect("/login?error=Authentication failed");
};
