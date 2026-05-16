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

const baseLayout = (content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
    <div style="background: #7A5C3E; color: white; padding: 20px; text-align: center;">
      <h1 style="margin:0; font-size: 28px;">📚 Papyrus</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85;">Online Bookstore</p>
    </div>
    <div style="background: #f9f7f4; padding: 32px 28px;">
      ${content}
    </div>
    <div style="background: #f0ebe3; padding: 16px; text-align: center; font-size: 12px; color: #8b7355;">
      <p style="margin: 0;">© Papyrus Bookstore &nbsp;|&nbsp; support@papyrus.com</p>
      <p style="margin: 6px 0 0;">This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
`;

const orderInfoBox = (order) => `
  <div style="background: white; border: 1px solid #e8dcc8; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; color: #5a4a3a;">
    <strong>Order ID:</strong> ${order.orderId}<br>
    <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}<br>
    <strong>Total:</strong> ₹${order.totalAmount.toFixed(2)}
  </div>
`;

export const orderStatusUpdateTemplate = (firstName, order, newStatus) => {
  const statusColors = {
    Processing: "#1976d2",
    Shipped: "#388e3c",
    Delivered: "#2e7d32",
    Cancelled: "#d32f2f",
    Returned: "#7b1fa2",
  };
  const color = statusColors[newStatus] || "#7A5C3E";

  return baseLayout(`
    <h2 style="color: #2d1f14; margin: 0 0 8px;">Hello ${firstName}!</h2>
    <p style="color: #5a4a3a; margin: 0 0 20px;">Your order status has been updated.</p>
    ${orderInfoBox(order)}
    <div style="text-align: center; margin: 24px 0;">
      <span style="display: inline-block; padding: 10px 28px; background: ${color}; color: white; border-radius: 20px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
        ${newStatus}
      </span>
    </div>
    <p style="color: #5a4a3a; font-size: 14px; text-align: center;">
      <a href="${process.env.APP_URL || "http://localhost:3000"}/orders/${order._id}" style="color: #7A5C3E; font-weight: 600;">View Order Details →</a>
    </p>
  `);
};

export const orderCancelledByAdminTemplate = (firstName, order, reason) =>
  baseLayout(`
  <h2 style="color: #2d1f14; margin: 0 0 8px;">Hello ${firstName},</h2>
  <p style="color: #5a4a3a; margin: 0 0 4px;">We're sorry to inform you that your order has been <strong style="color: #d32f2f;">cancelled</strong> by our team.</p>
  ${orderInfoBox(order)}
  ${
    reason
      ? `
  <div style="background: #fff3f3; border-left: 4px solid #d32f2f; padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #5a4a3a;">
    <strong>Reason:</strong> ${reason}
  </div>`
      : ""
  }
  <p style="color: #5a4a3a; font-size: 14px;">If you have any questions, please contact our support team at <a href="mailto:support@papyrus.com" style="color: #7A5C3E;">support@papyrus.com</a>.</p>
`);

export const returnApprovedTemplate = (firstName, order) =>
  baseLayout(`
  <h2 style="color: #2d1f14; margin: 0 0 8px;">Hello ${firstName}!</h2>
  <p style="color: #5a4a3a; margin: 0 0 4px;">Great news — your return request has been <strong style="color: #2e7d32;">approved</strong>.</p>
  ${orderInfoBox(order)}
  <div style="background: #f0faf0; border-left: 4px solid #2e7d32; padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #2e7d32;">
    Please ship the item(s) back to us. A refund will be processed once we receive the return.
  </div>
  <p style="color: #5a4a3a; font-size: 14px;">For shipping instructions, contact us at <a href="mailto:support@papyrus.com" style="color: #7A5C3E;">support@papyrus.com</a>.</p>
`);

export const returnRejectedTemplate = (firstName, order, reason) =>
  baseLayout(`
  <h2 style="color: #2d1f14; margin: 0 0 8px;">Hello ${firstName},</h2>
  <p style="color: #5a4a3a; margin: 0 0 4px;">We're sorry, but your return request has been <strong style="color: #d32f2f;">rejected</strong>.</p>
  ${orderInfoBox(order)}
  ${
    reason
      ? `
  <div style="background: #fff3f3; border-left: 4px solid #d32f2f; padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #5a4a3a;">
    <strong>Reason:</strong> ${reason}
  </div>`
      : ""
  }
  <p style="color: #5a4a3a; font-size: 14px;">If you believe this is a mistake, please contact us at <a href="mailto:support@papyrus.com" style="color: #7A5C3E;">support@papyrus.com</a>.</p>
`);

export const cartOutOfStockTemplate = (firstName, removedItems) => {
  const itemRows = removedItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0ebe3; font-size: 14px; color: #2d1f14;">
        <strong>${item.title}</strong>${item.author ? `<br><span style="font-size: 12px; color: #8b7355;">by ${item.author}</span>` : ""}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0ebe3; font-size: 14px; color: #5a4a3a; text-align: center;">${item.quantity}</td>
    </tr>
  `,
    )
    .join("");

  return baseLayout(`
    <h2 style="color: #2d1f14; margin: 0 0 8px;">Hello ${firstName},</h2>
    <p style="color: #5a4a3a; margin: 0 0 20px;">Some items in your cart have gone <strong style="color: #d32f2f;">out of stock</strong> and were automatically removed.</p>
    <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e8dcc8; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #f5f1ed;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #8b7355; text-transform: uppercase; letter-spacing: 0.5px;">Book</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #8b7355; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <p style="color: #5a4a3a; font-size: 14px; margin-top: 20px;">
      <a href="${process.env.APP_URL || "http://localhost:3000"}/shop" style="color: #7A5C3E; font-weight: 600;">Browse available books →</a>
    </p>
  `);
};
