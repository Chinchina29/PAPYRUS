import * as userService from '../../services/user.service.js';
import * as authService from '../../services/auth.service.js';
import * as otpService from '../../services/otp.service.js';
import * as emailService from '../../services/email.service.js';
import { successResponse, errorResponse, redirectResponse } from '../../helper/response.helper.js';

export const showProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await userService.findUserById(userId);
        
        if (!user) {
            return res.redirect('/login');
        }

        res.render('user/profile', { user });
    } catch (error) {
        console.error('Show profile error:', error);
        res.redirect('/login');
    }
};

export const showEditProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await userService.findUserById(userId);
        
        if (!user) {
            return res.redirect('/login');
        }

        res.render('user/editprofile', { user });
    } catch (error) {
        console.error('Show edit profile error:', error);
        res.redirect('/login');
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { 
            firstName, 
            lastName, 
            phone, 
            dateOfBirth, 
            gender, 
            bio, 
            favoriteGenre, 
            primaryInterest, 
            readingGoal 
        } = req.body;
        const userId = req.session.user.id;

        const updateData = {
            firstName,
            lastName,
            phone,
            dateOfBirth: dateOfBirth || null,
            gender,
            bio,
            favoriteGenre,
            primaryInterest,
            readingGoal: readingGoal ? parseInt(readingGoal) : null
        };

        const updatedUser = await userService.updateUser(userId, updateData);

        req.session.user.firstName = updatedUser.firstName;
        req.session.user.lastName = updatedUser.lastName;

        return successResponse(res, 'Profile updated successfully', {
            user: {
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                phone: updatedUser.phone,
                dateOfBirth: updatedUser.dateOfBirth,
                gender: updatedUser.gender,
                bio: updatedUser.bio,
                favoriteGenre: updatedUser.favoriteGenre,
                primaryInterest: updatedUser.primaryInterest,
                readingGoal: updatedUser.readingGoal
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.session.user.id;

        if (!newEmail) {
            return errorResponse(res, 'New email is required');
        }

        if (newEmail === req.session.user.email) {
            return errorResponse(res, 'New email must be different from current email');
        }

        const existingUser = await userService.findUserByEmail(newEmail);
        if (existingUser) {
            return errorResponse(res, 'Email already exists');
        }

        const otp = otpService.generateOTP();
        const user = await userService.findUserById(userId);
        
        user.emailChangeRequest = {
            newEmail: newEmail,
            otp: {
                code: otp,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        };
        await user.save();

        await emailService.sendEmailChangeOTP(newEmail, user.firstName, otp);

        return successResponse(res, 'OTP sent to new email address. Please verify to complete email change.');
    } catch (error) {
        console.error('Request email change error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const verifyEmailChange = async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.session.user.id;

        if (!otp) {
            return errorResponse(res, 'OTP is required');
        }

        const user = await userService.findUserById(userId);
        if (!user || !user.emailChangeRequest) {
            return errorResponse(res, 'No email change request found');
        }

        const isValidOTP = otpService.verifyOTP(
            user.emailChangeRequest.otp.code,
            user.emailChangeRequest.otp.expiresAt,
            otp
        );

        if (!isValidOTP) {
            return errorResponse(res, 'Invalid or expired OTP');
        }

        const newEmail = user.emailChangeRequest.newEmail;
        user.email = newEmail;
        user.emailChangeRequest = undefined;
        await user.save();

        req.session.user.email = newEmail;

        return successResponse(res, 'Email changed successfully', {
            newEmail: newEmail
        });
    } catch (error) {
        console.error('Verify email change error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const cancelEmailChange = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const user = await userService.findUserById(userId);
        if (user && user.emailChangeRequest) {
            user.emailChangeRequest = undefined;
            await user.save();
        }

        return successResponse(res, 'Email change request cancelled');
    } catch (error) {
        console.error('Cancel email change error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const showChangePassword = (req, res) => {
    res.render('user/changepassword');
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user.id;

        const user = await userService.findUserById(userId);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        const isMatch = await userService.comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return errorResponse(res, 'Current password is incorrect');
        }

        user.password = newPassword;
        await user.save();

        return successResponse(res, 'Password changed successfully');
    } catch (error) {
        console.error('Change password error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};
