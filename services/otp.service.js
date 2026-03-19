export const generateOTP = ()=>{
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
}

export const setOTP = (user)=>{
    const otp = generateOTP();
    user.otp={
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    };
    return otp;
}

export const verifyOTP = (otpCode, expiresAt, enteredOTP) => {
    if (!otpCode) {
        return false;
    }
    if (new Date() > expiresAt) {
        return false;
    }
    if (otpCode !== enteredOTP) {
        return false;
    }
    return true;
}

export const verifyUserOTP = (user, enteredOTP) => {
    if (!user.otp || !user.otp.code) {
        return { success: false, message: "No OTP found" };
    }
    if (new Date() > user.otp.expiresAt) {
        return { success: false, message: "OTP expired" };
    }
    if (user.otp.code !== enteredOTP) {
        return { success: false, message: "Invalid OTP" };
    }
    return { success: true, message: "OTP verified" };
}

export const clearOTP=(user)=>{
    user.otp = undefined
}
