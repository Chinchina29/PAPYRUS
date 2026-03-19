import nodemailer from "nodemailer";
import {
  otpEmailTemplate,
  passwordResetTemplate,
  emailChangeOTPTemplate,
} from "../config/email.config.js";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("EMAIL_USER or EMAIL_PASSWORD missing from .env");
      return { success: false, error: "Email credentials missing" };
    }

    console.log(`Sending email to: ${to}`);

    const transporter = createTransporter();
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `Papyrus <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.log(`Email sent! MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send failed:", error.message);
    if (error.code === "EAUTH") {
      return {
        success: false,
        error:
          "Gmail authentication failed. Please check your email credentials and app password.",
      };
    }
    return { success: false, error: error.message };
  }
};

export const sendOTPEmail = async (email, firstName, otp) => {
  const html = otpEmailTemplate(firstName, otp);
  return await sendEmail(email, "Verify Your Account - Papyrus", html);
};

export const sendPasswordResetOTP = async (email, firstName, otp) => {
  const html = passwordResetTemplate(firstName, otp);
  return await sendEmail(email, "Reset Your Password - Papyrus", html);
};

export const sendEmailChangeOTP = async (newEmail, firstName, otp) => {
  const html = emailChangeOTPTemplate(firstName, otp, newEmail);
  return await sendEmail(newEmail, "Verify Your New Email - Papyrus", html);
};
