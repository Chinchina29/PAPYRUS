import nodemailer from "nodemailer";
import {
  otpEmailTemplate,
  emailChangeOTPTemplate,
  passwordResetTemplate,
} from "../config/email.config.js";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD.replace(/\s/g, ''),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("\n📧 EMAIL SERVICE - DEVELOPMENT MODE:");
      console.log(`📬 To: ${to}`);
      console.log(`📝 Subject: ${subject}`);
      console.log("⚠️  Email credentials not configured - email not sent");
      console.log("✅ Returning success for development testing\n");
      return { success: true };
    }

    console.log(`\n📧 ATTEMPTING TO SEND REAL EMAIL:`);
    console.log(`📬 To: ${to}`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`📤 From: ${process.env.EMAIL_USER}`);
    console.log(`🔑 Password Length: ${process.env.EMAIL_PASSWORD.length} characters`);
    console.log(`🔑 Password Preview: ${process.env.EMAIL_PASSWORD.substring(0, 4)}****`);

    const transporter = createTransporter();
    
    console.log(`🔗 Testing Gmail connection...`);
    await transporter.verify();
    console.log(`✅ Gmail connection verified!`);

    console.log(`📤 Sending email...`);
    const info = await transporter.sendMail({
      from: `Papyrus <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent successfully!`);
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📬 Accepted: ${info.accepted}`);
    console.log(`❌ Rejected: ${info.rejected}\n`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("\n❌ EMAIL ERROR:");
    console.error("Error type:", error.name);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    if (error.code === 'EAUTH') {
      console.error("🚨 AUTHENTICATION FAILED!");
      console.error("💡 Solutions:");
      console.error("   1. Check if 2-Step Verification is enabled on Gmail");
      console.error("   2. Generate a new App Password");
      console.error("   3. Make sure you're using App Password, not regular password");
    }
    
    console.log("");
    return { success: false, error: error.message };
  }
};

export const sendOTPEmail = async (email, otp, firstName) => {
  const html = otpEmailTemplate(firstName, otp);
  return await sendEmail(email, "Verify Your Email - Papyrus", html);
};

export const sendEmailChangeOTP = async (newEmail, firstName, otp) => {
  const html = emailChangeOTPTemplate(firstName, otp, newEmail);
  return await sendEmail(newEmail, "Verify Your New Email - Papyrus", html);
};

export const sendPasswordResetEmail = async (email, otp, firstName) => {
  const html = passwordResetTemplate(firstName, otp);
  return await sendEmail(email, "Reset Your Password - Papyrus", html);
};
