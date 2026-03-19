import * as userService from './user.service.js';
import * as otpService from './otp.service.js';
import * as emailService from './email.service.js';

export const signupUser = async (userData) => {
    try {
        const existingUser = await userService.findUserByEmail(userData.email);
        if (existingUser) {
            return { success: false, message: 'Email already registered' };
        }
        
        const user = await userService.createUser({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: userData.password,
            role: 'user'
        });
        
        const otp = otpService.setOTP(user);
        await user.save();
        
        const emailResult = await emailService.sendOTPEmail(
            user.email,
            user.firstName,
            otp
        );
        
        if (!emailResult.success) {
            await userService.deleteUser(user._id);
            return { success: false, message: 'Failed to send verification email. Please try again.' };
        }
        
        return { success: true, user, message: "Account created! Please check your email for verification code." };
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, message: 'Server error during signup' };
    }
};

export const loginUser = async (email, password) => {
    const user = await userService.findUserByEmail(email);
    if (!user) {
        return { success: false, message: "Invalid email or password" };
    }

    if (user.isBlocked) {
        return { success: false, message: "Your account has been blocked. Please contact support." };
    }

    if (!user.isVerified) {
        const otp = otpService.setOTP(user);
        await user.save();
        
        await emailService.sendOTPEmail(user.email, user.firstName, otp);
        return { 
            success: false, 
            message: "Please verify your email first. A new OTP has been sent to your email.",
            needsVerification: true,
            email: user.email
        };
    }
    
    const isMatch = await userService.comparePassword(password, user.password);
    
    if (!isMatch) {
        return { success: false, message: 'Invalid email or password' };
    }
    
    if (user.gender === '') user.gender = null;
    if (user.favoriteGenre === '') user.favoriteGenre = null;
    if (user.primaryInterest === '') user.primaryInterest = null;
    await user.save();
    
    return { success: true, user, message: 'Login successful' };
};

export const verifyUserOTP = async (userId, otp) => {
    const user = await userService.findUserById(userId);
    if (!user) {
        return { success: false, message: 'User not found' };
    }

    const otpResult = otpService.verifyUserOTP(user, otp);
    if (!otpResult.success) {
        return otpResult;
    }

    user.isVerified = true;
    otpService.clearOTP(user);
    await user.save();

    return { success: true, user, message: 'Email verified successfully' };
};

export const resendUserOTP = async (userId) => {
    const user = await userService.findUserById(userId);
    if (!user) {
        return { success: false, message: 'User not found' };
    }

    if (user.isBlocked) {
        return { success: false, message: "Your account has been blocked. Please contact support." };
    }

    const otp = otpService.setOTP(user);
    await user.save();

    const emailResult = await emailService.sendOTPEmail(user.email, user.firstName, otp);
    
    if (!emailResult.success) {
        return { success: false, message: 'Failed to send OTP email' };
    }

    return { success: true, message: 'OTP sent successfully' };
};

export const forgotPassword = async (email) => {
    const user = await userService.findUserByEmail(email);
    if (!user) {
        return { success: false, message: 'No account found with this email address' };
    }

    if (user.isBlocked) {
        return { success: false, message: "Your account has been blocked. Please contact support." };
    }

    const otp = otpService.setOTP(user);
    await user.save();

    const emailResult = await emailService.sendPasswordResetOTP(user.email, user.firstName, otp);
    
    if (!emailResult.success) {
        return { success: false, message: 'Failed to send reset email' };
    }

    return { success: true, message: 'Password reset OTP sent to your email' };
};

export const resetPassword = async (email, otp, newPassword) => {
    const user = await userService.findUserByEmail(email);
    if (!user) {
        return { success: false, message: 'User not found' };
    }

    const otpResult = otpService.verifyUserOTP(user, otp);
    if (!otpResult.success) {
        return otpResult;
    }

    user.password = newPassword;
    otpService.clearOTP(user);
    await user.save();

    return { success: true, message: 'Password reset successfully' };
};