import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../Model/User.js";
passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser(async (IdleDeadline, done) => {
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
    async (accessToken, refreshToken, Profiler, done) => {
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
          profilePicture:
            profile.photos[0]?.value || "/images/default-avatar.png",
          isVerified: true,
          lastLogin: new Date(),
        });
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "emails", "name", "picture.type(large)"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ facebookId: profile.id });
        if (user) {
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.facebookId = profile.id;
          user.isVerified = true;
          user.profilePicture = profile.photos[0]?.value || user.profilePicture;
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        const newUser = await User.create({
          facebookId: profile.id,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          email: profile.emails[0].value,
          profilePicture:
            profile.photos[0]?.value || "/images/default-avatar.png",
          isVerified: true,
          lastLogin: new Date(),
        });
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);
export default passport;
