export const generateInvoiceHTML = (order) => {
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  let itemsHTML = '';
  order.items.forEach(item => {
    itemsHTML += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">₹${item.subtotal.toFixed(2)}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${order.orderId}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #2d2d2d; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #2d2d2d; padding-bottom: 20px; }
        .company-info h1 { margin: 0; font-size: 32px; color: #2d2d2d; }
        .company-info p { margin: 5px 0; color: #666; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { margin: 0; font-size: 24px; color: #2d2d2d; }
        .invoice-info p { margin: 5px 0; color: #666; }
        .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .address-block h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
        .address-block p { margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
        th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
        th:nth-child(2) { text-align: center; }
        .totals { margin-left: auto; width: 300px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .totals-row.total { font-size: 18px; font-weight: 700; border-top: 2px solid #2d2d2d; padding-top: 12px; margin-top: 8px; }
        .footer { margin-top: 60px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fef3c7; color: #92400e; }
        @media print {
          body { padding: 0; }
          .invoice-container { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <h1>PAPYRUS</h1>
            <p>Online Bookstore</p>
            <p>support@papyrus.com</p>
          </div>
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <p><strong>${order.orderId}</strong></p>
            <p>${invoiceDate}</p>
            <p><span class="status-badge status-${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</span></p>
          </div>
        </div>

        <div class="addresses">
          <div class="address-block">
            <h3>Bill To:</h3>
            <p><strong>${order.shippingAddress.fullName}</strong></p>
            <p>${order.shippingAddress.addressLine1}</p>
            ${order.shippingAddress.addressLine2 ? `<p>${order.shippingAddress.addressLine2}</p>` : ''}
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}</p>
            <p>${order.shippingAddress.phone}</p>
          </div>
          <div class="address-block">
            <h3>Payment Details:</h3>
            <p><strong>Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Status:</strong> ${order.paymentStatus}</p>
            <p><strong>Order Status:</strong> ${order.orderStatus}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>₹${order.subtotal.toFixed(2)}</span>
          </div>
          ${order.shippingCharge > 0 ? `
          <div class="totals-row">
            <span>Shipping:</span>
            <span>₹${order.shippingCharge.toFixed(2)}</span>
          </div>
          ` : ''}
          ${order.discount > 0 ? `
          <div class="totals-row">
            <span>Discount:</span>
            <span>-₹${order.discount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="totals-row total">
            <span>Total Amount:</span>
            <span>₹${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p><strong>Thank you for shopping with Papyrus!</strong></p>
          <p>For any queries, please contact us at support@papyrus.com</p>
          <p style="margin-top: 10px; font-size: 11px;">This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
