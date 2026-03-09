import * as userService from '../services/user.service.js';
import * as otpService from '../services/otp.service.js';
import * as emailService from '../services/email.service.js';
import { successResponse, errorResponse, redirectResponse } from '../helper/response.helper.js';

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await userService.findUserByEmail(email);
        if (!user) {
            return successResponse(res, 'If email exists, reset code has been sent');
        }

        const otp = otpService.setOTP(user);
        await user.save();

        const emailResult = await emailService.sendPasswordResetEmail(
            user.email,
            otp,
            user.firstName
        );

        if (!emailResult.success) {
            return errorResponse(res, 'Failed to send reset code', 500);
        }

        req.session.resetEmail = email;
        return redirectResponse(res, 'Reset code sent to your email', '/forgot-password/verify');
    } catch (error) {
        console.error('Forgot password error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const verifyResetOTP = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        
        const email = req.session.resetEmail;
        if (!email) {
            return errorResponse(res, 'Session expired. Please start over');
        }

        const user = await userService.findUserByEmail(email);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        const result = otpService.verifyOTP(user, otpCode);
        if (!result.success) {
            return errorResponse(res, result.message);
        }

        req.session.resetVerified = true;
        return redirectResponse(res, 'OTP verified successfully', '/forgot-password/reset');
    } catch (error) {
        console.error('Verify reset OTP error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        
        const email = req.session.resetEmail;
        const verified = req.session.resetVerified;

        if (!email || !verified) {
            return errorResponse(res, 'Unauthorized. Please complete verification first');
        }

        const user = await userService.findUserByEmail(email);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        user.password = password;
        otpService.clearOTP(user);
        await user.save();

        delete req.session.resetEmail;
        delete req.session.resetVerified;

        return redirectResponse(res, 'Password reset successful! You can now login', '/login');
    } catch (error) {
        console.error('Reset password error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const resendResetOTP = async (req, res) => {
    try {
        const email = req.session.resetEmail;
        if (!email) {
            return errorResponse(res, 'Session expired. Please start over');
        }

        const user = await userService.findUserByEmail(email);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        const otp = otpService.setOTP(user);
        await user.save();

        const emailResult = await emailService.sendPasswordResetEmail(
            user.email,
            otp,
            user.firstName
        );

        if (!emailResult.success) {
            return errorResponse(res, 'Failed to send OTP', 500);
        }

        return successResponse(res, 'New OTP sent to your email', { expiresIn: 600 });
    } catch (error) {
        console.error('Resend reset OTP error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};
