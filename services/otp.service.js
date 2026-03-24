import crypto from "crypto";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_REQUESTS = 5;
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_FAILED_ATTEMPTS = 3;
const FAILED_ATTEMPTS_LOCKOUT_MS = 5 * 60 * 1000;

export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

export function checkThrottle(user) {
  const now = Date.now();

  if (
    !user.otpThrottleWindowStart ||
    now - new Date(user.otpThrottleWindowStart).getTime() > THROTTLE_WINDOW_MS
  ) {
    user.otpThrottleWindowStart = new Date();
    user.otpRequestCount = 0;
  }

  if ((user.otpRequestCount || 0) >= MAX_OTP_REQUESTS) {
    const windowStart = new Date(user.otpThrottleWindowStart).getTime();
    const windowEndsAt = windowStart + THROTTLE_WINDOW_MS;
    const secondsLeft = Math.ceil((windowEndsAt - now) / 1000);
    const minutesLeft = Math.ceil(secondsLeft / 60);

    return {
      allowed: false,
      secondsLeft,
      minutesLeft,
      reason: `Too many OTP requests. Please wait ${minutesLeft} minute(s) before trying again.`,
      type: "throttle",
    };
  }

  if (user.otpFailedAttempts >= MAX_FAILED_ATTEMPTS && user.otpLockoutUntil) {
    const lockoutEnd = new Date(user.otpLockoutUntil).getTime();
    if (now < lockoutEnd) {
      const secondsLeft = Math.ceil((lockoutEnd - now) / 1000);
      const minutesLeft = Math.ceil(secondsLeft / 60);

      return {
        allowed: false,
        secondsLeft,
        minutesLeft,
        reason: `Too many failed attempts. Account temporarily locked for ${minutesLeft} minute(s).`,
        type: "lockout",
      };
    } else {
      user.otpFailedAttempts = 0;
      user.otpLockoutUntil = undefined;
    }
  }

  if (user.otpLastSentAt) {
    const elapsed = now - new Date(user.otpLastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);

      return {
        allowed: false,
        secondsLeft,
        minutesLeft: 0,
        reason: `Please wait ${secondsLeft} second(s) before requesting another OTP.`,
        type: "cooldown",
      };
    }
  }

  return {
    allowed: true,
    secondsLeft: 0,
    minutesLeft: 0,
    reason: "",
    type: "allowed",
  };
}

export function setOTP(user) {
  const otp = generateOTP();

  user.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  };

  user.otpLastSentAt = new Date();
  user.otpRequestCount = (user.otpRequestCount || 0) + 1;

  if (!user.otpThrottleWindowStart) {
    user.otpThrottleWindowStart = new Date();
  }

  return otp;
}

export function verifyUserOTP(user, otpCode) {
  const now = Date.now();

  if (user.otpFailedAttempts >= MAX_FAILED_ATTEMPTS && user.otpLockoutUntil) {
    const lockoutEnd = new Date(user.otpLockoutUntil).getTime();
    if (now < lockoutEnd) {
      const minutesLeft = Math.ceil((lockoutEnd - now) / (1000 * 60));
      return {
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        type: "lockout",
      };
    } else {
      user.otpFailedAttempts = 0;
      user.otpLockoutUntil = undefined;
    }
  }

  if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
    return {
      success: false,
      message: "No OTP found. Please request a new one.",
      type: "no_otp",
    };
  }

  if (new Date() > new Date(user.otp.expiresAt)) {
    clearOTP(user);
    return {
      success: false,
      message: "OTP has expired. Please request a new one.",
      type: "expired",
    };
  }

  if (user.otp.code !== otpCode) {
    user.otpFailedAttempts = (user.otpFailedAttempts || 0) + 1;

    if (user.otpFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      user.otpLockoutUntil = new Date(now + FAILED_ATTEMPTS_LOCKOUT_MS);
      const minutesLeft = Math.ceil(FAILED_ATTEMPTS_LOCKOUT_MS / (1000 * 60));

      return {
        success: false,
        message: `Too many failed attempts. Account locked for ${minutesLeft} minutes.`,
        type: "locked",
      };
    }

    const attemptsLeft = MAX_FAILED_ATTEMPTS - user.otpFailedAttempts;
    return {
      success: false,
      message: `Invalid OTP. ${attemptsLeft} attempt(s) remaining.`,
      type: "invalid",
      attemptsLeft,
    };
  }

  user.otpFailedAttempts = 0;
  user.otpLockoutUntil = undefined;
  clearOTP(user);

  return {
    success: true,
    message: "OTP verified successfully.",
    type: "success",
  };
}

export function clearOTP(user) {
  user.otp = undefined;
}

export function resetThrottling(user) {
  user.otpRequestCount = 0;
  user.otpThrottleWindowStart = undefined;
  user.otpLastSentAt = undefined;
  user.otpFailedAttempts = 0;
  user.otpLockoutUntil = undefined;
}

export function getThrottleStatus(user) {
  const throttle = checkThrottle(user);
  const now = Date.now();

  return {
    isThrottled: !throttle.allowed,
    type: throttle.type,
    reason: throttle.reason,
    secondsLeft: throttle.secondsLeft,
    minutesLeft: throttle.minutesLeft,
    requestCount: user.otpRequestCount || 0,
    maxRequests: MAX_OTP_REQUESTS,
    failedAttempts: user.otpFailedAttempts || 0,
    maxFailedAttempts: MAX_FAILED_ATTEMPTS,
    isLocked:
      user.otpFailedAttempts >= MAX_FAILED_ATTEMPTS &&
      user.otpLockoutUntil &&
      now < new Date(user.otpLockoutUntil).getTime(),
  };
}
