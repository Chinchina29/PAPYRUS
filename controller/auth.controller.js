import * as authService from '../services/auth.service.js';
import { successResponse,errorResponse,redirectResponse } from '../helper/response.helper.js';

export const signup = async (req,res)=>{
    try{
        const result = await authService.signupUser(req.body)
        if(!result.success){
            return errorResponse(res,result.message)
        }
        req.session.tempUserId = result.user._id.toString();
        req.session.tempUserEmail = result.user.email;
        return redirectResponse(res,result.message,'/signup/verify-otp');
    }catch (error){
        console.error('Signup error :',error);
        return errorResponse(res,'Server error',500)
    }
};

export const verifyOTP = async(req,res) =>{
    try{
        const {otp1,otp2,otp3,otp4,otp5,otp6}= req.body;
        const otpCode =`${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const result = await authService.verifyUserOTP(req.session.tempUserId,otpCode)
        if(!result.success){
            return errorResponse(res,result.message)
        }
        req.session.userId = result.user._id.toString()
        req.session.user = {
            id : result.user._id,
            firstName : result.user.firstName,
            lastName: result.user.lastName,
            email :result.user.email
        }
        delete req.session.tempUserId;
        delete req.session.tempUserEmail;

        return redirectResponse(res, result.message,'/home');
    }catch (error){
        console.error('Verify OTP error :',error);
        return errorResponse(res,'Server error',500)
    }
};

export const resendOTP = async (req,res)=>{
    try{
        const result = await authService.resendUserOTP(req.session.tempUserId);
        if(!result.success){
            return errorResponse(res,result.message)
        }
        return successResponse(res,result.message,{expiresIn :600});
    }catch (error){
        console.error('Resend OTP error :',error);
        return errorResponse(res,'Server error',500)
    }
};

export const login = async (req,res) =>{
    try{
        const {email,password} = req.body;
        const result = await authService.loginUser(email,password);
        if(!result.success){
              if (result.needsVerification) {
                req.session.tempUserId = result.userId.toString();
                return redirectResponse(res, result.message, '/signup/verify-otp');
            }
            return errorResponse(res, result.message);
        }
        req.session.userId = result.user._id.toString();
        req.session.user = {
            id: result.user._id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email
        };

        return redirectResponse(res, result.message, '/home');
    } catch (error) {
        console.error('Login error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return errorResponse(res, 'Error logging out', 500);
        }
        res.redirect('/login');
    });
};
