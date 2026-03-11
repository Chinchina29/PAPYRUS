import * as userService from './user.service.js';
import * as  otpService from './otp.service.js';
import * as emailService from './email.service.js';

export const signupUser = async (userData) => {
    try {
        console.log('\n🚀 SIGNUP PROCESS STARTED:');
        console.log('📝 User data received:', { 
            firstName: userData.firstName, 
            lastName: userData.lastName, 
            email: userData.email 
        });
        
        const existingUser = await userService.findUserByEmail(userData.email);
        if (existingUser) {
            console.log('❌ Email already exists:', userData.email);
            return { success: false, message: 'Email already registered' };
        }
        
        console.log('✅ Email available, creating user...');
        const user = await userService.createUser({
            ...userData,
            isVerified: false
        });
        
        console.log('✅ User created successfully');
        console.log('🔐 Generating OTP...');
        
        const otp = otpService.setOTP(user);
        await user.save();
        
        console.log('📧 Attempting to send OTP email...');
        const emailResult = await emailService.sendOTPEmail(
            user.email,
            otp,
            user.firstName
        );
        
        if (!emailResult.success) {
            console.log('❌ Email sending failed, cleaning up user...');
            await userService.deleteUser(user._id);
            console.error('Email sending failed:', emailResult.error);
            return { success: false, message: 'Failed to send verification email. Please try again.' };
        }
        
        console.log('✅ SIGNUP PROCESS COMPLETED SUCCESSFULLY\n');
        return { success: true, user, message: "OTP sent to your email" };
    } catch (error) {
        console.error('❌ SIGNUP SERVICE ERROR:', error);
        return { success: false, message: 'Registration failed. Please try again.' };
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
        await emailService.sendOTPEmail(user.email, otp, user.firstName);
        return {
            success: false,
            message: 'Please verify email first. New OTP sent',
            needsVerification: true,
            userId: user._id
        };
    }
    
    const isMatch = await userService.comparePassword(password, user.password);
    if (!isMatch) {
        return { success: false, message: 'Invalid email or password' };
    }
    
    user.lastLogin = new Date();
    await user.save();
    return { success: true, user, message: "Login successful" };
};

export const verifyUserOTP = async (userId,otpCode)=>{
    const user = await userService.findUserById(userId);
    if(!user){
        return { success:false,message:"User not found"}
    }
    const result=otpService.verifyOTP(user,otpCode);
    if(!result.success){
        return result
    }
    user.isVerified = true;
    otpService.clearOTP(user);
    user.lastLogin = new Date();
    await user.save();
    return { success: true,user,message:"Email verified successfully"}
}

export const resendUserOTP = async (userId)=>{
    const user = await userService.findUserById(userId);
    if(!user){
        return { success: false,message:"User not found"}
    }

    const otp = otpService.setOTP(user);
    await user.save();
    const emailResult = await emailService.sendOTPEmail(
        user.email,
        otp,
        user.firstName
    );
    if(!emailResult.success){
        return {success: false,message:"Failed to send OTP"}
    }
    return {success: true,message:"New OTP send to your email"}
}
