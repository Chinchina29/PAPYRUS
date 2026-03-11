import * as userService from './user.service.js';
import * as  otpService from './otp.service.js';
import * as emailService from './email.service.js';

export const signupUser = async (userData) => {
    try {
        console.log('🚀 SIGNUP PROCESS STARTED for:', userData.email);
        
        const existingUser = await userService.findUserByEmail(userData.email);
        if (existingUser) {
            console.log('❌ Email already exists:', userData.email);
            return { success: false, message: 'Email already registered' };
        }
        
        console.log('✅ Creating new user...');
        const user = await userService.createUser({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: userData.password,
            isVerified: false
        });
        
        console.log('✅ User created, generating OTP...');
        const otp = otpService.setOTP(user);
        await user.save();
        
        console.log('📧 Sending OTP email...');
        const emailResult = await emailService.sendOTPEmail(
            user.email,
            otp,
            user.firstName
        );
        
        if (!emailResult.success) {
            console.log('❌ Email failed, cleaning up...');
            await userService.deleteUser(user._id);
            return { success: false, message: 'Failed to send verification email. Please try again.' };
        }
        
        console.log('✅ SIGNUP COMPLETED SUCCESSFULLY');
        return { success: true, user, message: "Account created! Please check your email for verification code." };
    } catch (error) {
        console.error('❌ SIGNUP ERROR:', error);
        return { success: false, message: 'Registration failed: ' + error.message };
    }
};
 
export const loginUser = async (email, password) => {
    console.log('🔐 LOGIN ATTEMPT:', { email, passwordLength: password?.length });
    
    const user = await userService.findUserByEmail(email);
    if (!user) {
        console.log('❌ User not found for email:', email);
        return { success: false, message: "Invalid email or password" };
    }

    console.log('👤 User found:', { 
        email: user.email, 
        isVerified: user.isVerified, 
        isBlocked: user.isBlocked,
        hasPassword: !!user.password,
        passwordLength: user.password?.length 
    });

    if (user.isBlocked) {
        console.log('🚫 User is blocked:', email);
        return { success: false, message: "Your account has been blocked. Please contact support." };
    }

    if (!user.isVerified) {
        console.log('📧 User not verified, sending OTP:', email);
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
    
    console.log('🔑 Comparing passwords...');
    const isMatch = await userService.comparePassword(password, user.password);
    console.log('🔑 Password match result:', isMatch);
    
    if (!isMatch) {
        console.log('❌ Password mismatch for user:', email);
        return { success: false, message: 'Invalid email or password' };
    }
    
    console.log('✅ Login successful for user:', email);
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
