export const otpEmailTemplate = (firstName, otp) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7A5C3E; color: white; padding: 20px; text-align: center;">
                <h1>📚 Papyrus</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px;">
                <h2>Hello ${firstName}!</h2>
                <p>Your verification code is:</p>
                <div style="background: white; border: 2px solid #7A5C3E; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #7A5C3E; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p><strong>This code will expire in 10 minutes.</strong></p>
            </div>
        </div>
    `;
};

export const emailChangeOTPTemplate = (firstName, otp, newEmail) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7A5C3E; color: white; padding: 20px; text-align: center;">
                <h1>📚 Papyrus</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px;">
                <h2>Hello ${firstName}!</h2>
                <p>You requested to change your email address to: <strong>${newEmail}</strong></p>
                <p>Your verification code is:</p>
                <div style="background: white; border: 2px solid #7A5C3E; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #7A5C3E; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p><strong>This code will expire in 10 minutes.</strong></p>
                <p style="color: #666; font-size: 14px;">If you didn't request this change, please ignore this email.</p>
            </div>
        </div>
    `;
};

export const passwordResetTemplate = (firstName, otp) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7A5C3E; color: white; padding: 20px; text-align: center;">
                <h1>📚 Papyrus</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px;">
                <h2>Hello ${firstName}!</h2>
                <p>Your password reset code is:</p>
                <div style="background: white; border: 2px solid #7A5C3E; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #7A5C3E; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p><strong>This code will expire in 10 minutes.</strong></p>
            </div>
        </div>
    `;
};
