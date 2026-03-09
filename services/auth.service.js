import * as userService from './user.service.js';
import * as  otpService from './otp.service.js';
import * as emailService from './email.service.js';

export const signupUser=async(userData) =>{
    const existingUser = await userService.findUserByEmail(userData.email);
    if(existingUser){
        return { success : false, message :'Email already registered'}
    }
    const user = await userService.createUser({
        ...userData,
        isVerified :false
    });
    const otp = otpService.setOTP(user);
    await user.save();
    const emailResult = await emailService.sendOTPEmail(
        user.email,
        otp,
        user.firstName
    );
    if(!emailResult.success){
        await userService.deleteUser(user._id);
        return {success:false,message: 'Failed to send verification eamil'}
    }
    return {success:true,user,message:" OTP sent to your email"}
}
 
export const loginUser = async (email,password)=>{
    const user =await userService.findUserByEmail(email);
    if(!user){
        return{success:false,message:"Invalid e-Mail or password"}
    }

    if(!user.isVerified){
        const otp =otpService.setOTP(user);
        await user.save()
        await emailService.sendOTPEmail(user.email,otp,user.firstName)
        return{
            success: false,
            message: 'Please verify email first . New OTP sent',
            needsVerification: true,
            userId: user._id
        }
    }
    const isMatch = await userService.comparePassword(password,user.password);
    if(!isMatch){
        return{success : false,message:'Invalid email or password'}
    }
    user.lastLogin = new Date();
    await user.save();
    return{success: true,user,message:" Login successfull"}
}

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
