import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../Model/User.js";

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          user.isVerified = true;
          user.profilePicture = profile.photos[0]?.value || user.profilePicture;
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        const newUser = await User.create({
          googleId: profile.id,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          email: profile.emails[0].value,
          profilePicture: profile.photos[0]?.value || "/images/default-avatar.png",
          isVerified: true,
          lastLogin: new Date(),
        });
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
