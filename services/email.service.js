import nodemailer from 'nodemailer';
import { otpEmailTemplate,passwordResetTemplate } from '../config/email.config.js';

const transporter = nodemailer.createTransport({
    service :"gmail",
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD    
    }
})

const sendEmail=async(to,subject,html)=>{
    try{
        await transporter.sendMail({
            from: `Papyrus <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        })
        return{ success: true};
    }catch (error){
        console.error('Email error:',error)
        return {success : false,error: error.message}
    }
}

export const sendOTPEmail=async(email,otp,firstName)=>{
    const html = otpEmailTemplate(firstName,otp);
    return await sendEmail(email,'Verify Your Email - Papyrus',html);
};

export const sendPasswordResetEmail = async(email,otp,firstName)=>{
    const html=passwordResetTemplate(firstName,otp);
    return await sendEmail(email,'Reset Your Password - Papyrus',html)
}
