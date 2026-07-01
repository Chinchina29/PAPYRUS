import MESSAGES from "../../shared/constants/messages.js";
import * as userService from "../../shared/services/user.service.js";
import * as otpService from "../../shared/services/otp.service.js";
import * as emailService from "../../shared/services/email.service.js";
import * as referralService from "../../shared/services/referral.service.js";

export const signupUser = async (userData) => {
  try {
    const existingUser = await userService.findUserByEmail(userData.email);
    if (existingUser) {
      return { success: false, message: MESSAGES.AUTH.EMAIL_ALREADY_EXISTS };
    }

    let referralValidation = { isValid: true };
    if (userData.referralCode) {
      referralValidation = await referralService.validateReferralCode(
        userData.referralCode,
        userData.email
      );
      if (!referralValidation.isValid) {
        return {
          success: false,
          message: referralValidation.message,
          errorType: "INVALID_REFERRAL_CODE",
        };
      }
    }

    const referralCode = await referralService.generateReferralCode();

    const user = await userService.createUser({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      role: "user",
      referralCode,
    });

    if (referralValidation.isValid && referralValidation.referrerId) {
      await referralService.createReferralRecord(
        referralValidation.referrerId,
        user._id,
        referralValidation.referralCode
      );
    }

    const otp = otpService.setOTP(user);
    await user.save();

    const emailResult = await emailService.sendOTPEmail(
      user.email,
      user.firstName,
      otp
    );
    if (!emailResult.success) {
      await userService.deleteUser(user._id);
      return {
        success: false,
        message: MESSAGES.AUTH.OTP_SENT,
      };
    }

    return {
      success: true,
      user,
      message: MESSAGES.AUTH.SIGNUP_SUCCESS,
    };
  } catch (error) {
    return { success: false, message: MESSAGES.COMMON.INTERNAL_ERROR };
  }
};
export const loginUser = async (email, password) => {
  try {
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return { success: false, message: MESSAGES.AUTH.INVALID_CREDENTIALS };
    }
    if (!user.password) {
      return {
        success: false,
        message:
          MESSAGES.CUSTOM
            .THIS_ACCOUNT_USES_GOOGLE_SIGN_IN_PLEASE_LOGIN_WITH_GOOGLE,
      };
    }
    if (user.isBlocked) {
      return {
        success: false,
        message:
          MESSAGES.CUSTOM.YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_SUPPORT,
      };
    }
    if (!user.isVerified) {
      const throttle = otpService.checkThrottle(user);
      if (!throttle.allowed) {
        return {
          success: false,
          message: throttle.reason,
          needsVerification: true,
          userId: user._id,
        };
      }
      const otp = otpService.setOTP(user);
      await user.save();
      await emailService.sendOTPEmail(user.email, user.firstName, otp);
      return {
        success: false,
        message:
          MESSAGES.CUSTOM
            .PLEASE_VERIFY_YOUR_EMAIL_FIRST_A_NEW_OTP_HAS_BEEN_SENT_TO_YOUR_EMAIL,
        needsVerification: true,
        email: user.email,
        userId: user._id,
      };
    }
    const isMatch = await userService.comparePassword(password, user.password);
    if (!isMatch) {
      return { success: false, message: MESSAGES.AUTH.INVALID_CREDENTIALS };
    }
    if (user.gender === "") user.gender = null;
    if (user.favoriteGenre === "") user.favoriteGenre = null;
    if (user.primaryInterest === "") user.primaryInterest = null;
    await user.save();
    return { success: true, user, message: MESSAGES.AUTH.LOGIN_SUCCESS };
  } catch (error) {
    return {
      success: false,
      message: MESSAGES.CUSTOM.SERVER_ERROR_DURING_LOGIN,
    };
  }
};
export const verifyUserOTP = async (userId, otp) => {
  try {
    const user = await userService.findUserById(userId);
    if (!user) {
      return { success: false, message: MESSAGES.USER.NOT_FOUND };
    }
    const otpResult = otpService.verifyUserOTP(user, otp);
    if (!otpResult.success) {
      return otpResult;
    }
    user.isVerified = true;
    otpService.clearOTP(user);
    await user.save();

    if (user.referredBy) {
      await referralService.distributeRefereeReward(user._id);
    }

    return {
      success: true,
      user,
      message: MESSAGES.CUSTOM.EMAIL_VERIFIED_SUCCESSFULLY,
    };
  } catch (error) {
    return {
      success: false,
      message: MESSAGES.CUSTOM.SERVER_ERROR_DURING_VERIFICATION,
    };
  }
};
export const resendUserOTP = async (userId) => {
  try {
    const user = await userService.findUserById(userId);
    if (!user) {
      return { success: false, message: MESSAGES.USER.NOT_FOUND };
    }
    if (user.isBlocked) {
      return {
        success: false,
        message:
          MESSAGES.CUSTOM.YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_SUPPORT,
      };
    }
    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      return {
        success: false,
        message: throttle.reason,
        secondsLeft: throttle.secondsLeft,
      };
    }
    const otp = otpService.setOTP(user);
    await user.save();
    const emailResult = await emailService.sendOTPEmail(
      user.email,
      user.firstName,
      otp,
    );
    if (!emailResult.success) {
      return {
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_SEND_OTP_EMAIL,
      };
    }
    return { success: true, message: MESSAGES.AUTH.OTP_SENT };
  } catch (error) {
    return { success: false, message: MESSAGES.CUSTOM.SERVER_ERROR };
  }
};
export const forgotPassword = async (email) => {
  try {
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: MESSAGES.CUSTOM.NO_ACCOUNT_FOUND_WITH_THIS_EMAIL_ADDRESS,
      };
    }
    if (user.isBlocked) {
      return {
        success: false,
        message:
          MESSAGES.CUSTOM.YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_SUPPORT,
      };
    }
    const throttle = otpService.checkThrottle(user);
    if (!throttle.allowed) {
      return {
        success: false,
        message: throttle.reason,
        secondsLeft: throttle.secondsLeft,
      };
    }
    const otp = otpService.setOTP(user);
    await user.save();
    const emailResult = await emailService.sendPasswordResetOTP(
      user.email,
      user.firstName,
      otp,
    );
    if (!emailResult.success) {
      return {
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_SEND_RESET_EMAIL,
      };
    }
    return {
      success: true,
      message: MESSAGES.CUSTOM.PASSWORD_RESET_OTP_SENT_TO_YOUR_EMAIL,
    };
  } catch (error) {
    return { success: false, message: MESSAGES.CUSTOM.SERVER_ERROR };
  }
};
export const resetPassword = async (email, otp, newPassword) => {
  try {
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return { success: false, message: MESSAGES.USER.NOT_FOUND };
    }
    const otpResult = otpService.verifyUserOTP(user, otp);
    if (!otpResult.success) {
      return otpResult;
    }
    user.password = newPassword;
    otpService.clearOTP(user);
    await user.save();
    return {
      success: true,
      message: MESSAGES.CUSTOM.PASSWORD_RESET_SUCCESSFULLY,
    };
  } catch (error) {
    return { success: false, message: MESSAGES.CUSTOM.SERVER_ERROR };
  }
};
