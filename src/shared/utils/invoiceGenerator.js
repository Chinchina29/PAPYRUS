import PDFDocument from "pdfkit";
export const generateInvoicePDF = (order, res) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const filename = `invoice-${order.orderId}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);
  const colors = {
    dark: "#2d1f14",
    muted: "#6b7280",
    light: "#f9fafb",
    border: "#e5e7eb",
    accent: "#8b7355",
  };
  const pageWidth = doc.page.width - 100;
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text("PAPYRUS", 50, 50);
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.muted)
    .text("Online Bookstore", 50, 85)
    .text("support@papyrus.com", 50, 100);
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text("INVOICE", 0, 50, { align: "right" });
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.muted)
    .text(order.orderId, 0, 80, { align: "right" })
    .text(invoiceDate, 0, 95, { align: "right" })
    .text(`Payment: ${order.paymentStatus}`, 0, 110, { align: "right" });
  doc
    .moveTo(50, 130)
    .lineTo(545, 130)
    .strokeColor(colors.dark)
    .lineWidth(1.5)
    .stroke();
  const addrY = 150;
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(colors.muted)
    .text("BILL TO", 50, addrY);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text(order.shippingAddress.fullName, 50, addrY + 16);
  const addrLines = [
    order.shippingAddress.addressLine1,
    order.shippingAddress.addressLine2,
    `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`,
    order.shippingAddress.phone,
  ].filter(Boolean);
  doc.fontSize(10).font("Helvetica").fillColor(colors.muted);
  addrLines.forEach((line, i) => {
    doc.text(line, 50, addrY + 32 + i * 15);
  });
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(colors.muted)
    .text("PAYMENT DETAILS", 350, addrY);
  const paymentDetails = [
    ["Method", order.paymentMethod],
    ["Status", order.paymentStatus],
    ["Order Status", order.orderStatus],
  ];
  paymentDetails.forEach(([label, value], i) => {
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.muted)
      .text(`${label}:`, 350, addrY + 16 + i * 18);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.dark)
      .text(value, 430, addrY + 16 + i * 18);
  });
  const tableTop = addrY + 100;
  const colX = { item: 50, qty: 340, price: 400, total: 470 };
  doc.rect(50, tableTop, pageWidth, 28).fill(colors.light);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(colors.muted)
    .text("ITEM DESCRIPTION", colX.item + 4, tableTop + 9)
    .text("QTY", colX.qty, tableTop + 9, { width: 50, align: "center" })
    .text("UNIT PRICE", colX.price, tableTop + 9, { width: 60, align: "right" })
    .text("TOTAL", colX.total, tableTop + 9, { width: 60, align: "right" });
  doc
    .moveTo(50, tableTop + 28)
    .lineTo(545, tableTop + 28)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();
  let rowY = tableTop + 36;
  order.items.forEach((item, index) => {
    const titleHeight = doc.heightOfString(item.title, {
      width: 270,
      fontSize: 11,
    });
    const rowHeight = Math.max(titleHeight + 16, 30);
    if (rowY + rowHeight > doc.page.height - 200) {
      doc.addPage();
      rowY = 50;
    }
    const isCancelled = item.itemStatus === "Cancelled";
    const isReturned = item.itemStatus === "Returned";
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(isCancelled || isReturned ? colors.muted : colors.dark)
      .text(item.title, colX.item + 4, rowY, { width: 270 });
    if (isCancelled) {
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#dc2626")
        .text("CANCELLED", colX.item + 4, rowY + 12);
    } else if (isReturned) {
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#ea580c")
        .text("RETURNED", colX.item + 4, rowY + 12);
    }
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(isCancelled || isReturned ? colors.muted : colors.dark)
      .text(String(item.quantity), colX.qty, rowY, {
        width: 50,
        align: "center",
      });
    const unitPriceText = `Rs.${parseFloat(item.price).toFixed(2)}`;
    doc.text(unitPriceText, colX.price, rowY, { width: 60, align: "right" });
    const totalPriceText = `Rs.${parseFloat(item.subtotal).toFixed(2)}`;
    if (isCancelled || isReturned) {
      doc
        .font("Helvetica")
        .fillColor(colors.muted)
        .text(totalPriceText, colX.total, rowY, { width: 75, align: "right" });
      const textWidth = doc.widthOfString(totalPriceText);
      const startX = colX.total + 75 - textWidth;
      doc
        .moveTo(startX, rowY + 7)
        .lineTo(startX + textWidth, rowY + 7)
        .strokeColor(colors.muted)
        .lineWidth(1)
        .stroke();
    } else {
      doc
        .font("Helvetica-Bold")
        .fillColor(colors.dark)
        .text(totalPriceText, colX.total, rowY, { width: 75, align: "right" });
    }
    rowY += rowHeight;
    if (index < order.items.length - 1) {
      doc
        .moveTo(50, rowY)
        .lineTo(545, rowY)
        .strokeColor(colors.border)
        .lineWidth(0.5)
        .stroke();
      rowY += 8;
    }
  });
  rowY += 10;
  const totalsX = 350;
  const totalsValueX = 470;
  let activeSubtotal = 0;
  let cancelledAmount = 0;
  let returnedAmount = 0;
  order.items.forEach((item) => {
    const isCancelled = item.itemStatus === "Cancelled";
    const isReturned = item.itemStatus === "Returned";
    if (isCancelled) {
      cancelledAmount += item.subtotal;
    } else if (isReturned) {
      returnedAmount += item.subtotal;
    } else {
      activeSubtotal += item.subtotal;
    }
  });
  const adjustedShipping =
    activeSubtotal >= 500 ? 0 : activeSubtotal > 0 ? order.shippingCharge : 0;
  // Apply the same coupon validation logic as order details
  let adjustedDiscount = 0;
  let couponInvalidReason = null;
  if (order.discount > 0 && order.couponCode) {
    // Check if active subtotal meets minimum purchase requirement of ₹1000
    const assumedMinPurchase = 1000;
    if (activeSubtotal >= assumedMinPurchase) {
      adjustedDiscount = order.discount;
    } else {
      couponInvalidReason = `Coupon requires minimum ₹${assumedMinPurchase} purchase. Active items: ₹${activeSubtotal.toFixed(2)}`;
    }
  }
  const adjustedTotal = activeSubtotal + adjustedShipping - adjustedDiscount;
  const addTotalsRow = (label, value, bold = false, isTotal = false) => {
    if (isTotal) {
      doc
        .moveTo(totalsX, rowY)
        .lineTo(545, rowY)
        .strokeColor(colors.dark)
        .lineWidth(1.5)
        .stroke();
      rowY += 8;
    }
    const fontSize = isTotal ? 13 : 11;
    const font = bold ? "Helvetica-Bold" : "Helvetica";
    doc.fontSize(fontSize).font(font).fillColor(colors.dark);
    doc.text(label, totalsX, rowY);
    doc.text(value, totalsX + 120, rowY, { width: 75, align: "right" });
    rowY += isTotal ? 20 : 18;
  };
  if (order.subtotal !== activeSubtotal) {
    addTotalsRow(
      "Original Subtotal:",
      `Rs.${parseFloat(order.subtotal).toFixed(2)}`,
    );
    if (cancelledAmount > 0) {
      addTotalsRow(
        "Less: Cancelled Items:",
        `-Rs.${parseFloat(cancelledAmount).toFixed(2)}`,
        false,
        false,
      );
    }
    if (returnedAmount > 0) {
      addTotalsRow(
        "Less: Returned Items:",
        `-Rs.${parseFloat(returnedAmount).toFixed(2)}`,
        false,
        false,
      );
    }
    addTotalsRow(
      "Active Subtotal:",
      `Rs.${parseFloat(activeSubtotal).toFixed(2)}`,
      true,
      false,
    );
  } else {
    addTotalsRow("Subtotal:", `Rs.${parseFloat(activeSubtotal).toFixed(2)}`);
  }
  if (adjustedShipping > 0) {
    addTotalsRow("Shipping:", `Rs.${parseFloat(adjustedShipping).toFixed(2)}`);
  }
  if (order.discount > 0) {
    if (adjustedDiscount > 0) {
      addTotalsRow("Discount:", `-Rs.${parseFloat(adjustedDiscount).toFixed(2)}`);
    } else if (couponInvalidReason) {
      // Show invalid coupon with reason
      addTotalsRow(`Discount (${order.couponCode}) - Invalid:`, `Rs.0.00`);
      // Add a note about the coupon being invalid
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#dc2626")
        .text(couponInvalidReason, totalsX, rowY, { width: 195 });
      rowY += 15;
    }
  }
  addTotalsRow(
    "Total Amount:",
    `Rs.${parseFloat(adjustedTotal).toFixed(2)}`,
    true,
    true,
  );
  const footerY = Math.max(rowY + 40, doc.page.height - 120);
  if (footerY > doc.page.height - 100) {
    doc.addPage();
    const newFooterY = 50;
    doc
      .moveTo(50, newFooterY)
      .lineTo(545, newFooterY)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.dark)
      .text("Thank you for shopping with Papyrus!", 50, newFooterY + 12, {
        align: "center",
      });
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(colors.muted)
      .text(
        "For any queries, contact us at support@papyrus.com",
        50,
        newFooterY + 28,
        { align: "center" },
      )
      .text(
        "This is a computer-generated invoice and does not require a signature.",
        50,
        newFooterY + 43,
        { align: "center" },
      );
  } else {
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.dark)
      .text("Thank you for shopping with Papyrus!", 50, footerY + 12, {
        align: "center",
      });
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(colors.muted)
      .text(
        "For any queries, contact us at support@papyrus.com",
        50,
        footerY + 28,
        { align: "center" },
      )
      .text(
        "This is a computer-generated invoice and does not require a signature.",
        50,
        footerY + 43,
        { align: "center" },
      );
  }
  doc.end();
};
export const generateInvoiceHTML = (order) => {
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Calculate active, cancelled, and returned amounts
  let activeSubtotal = 0;
  let cancelledAmount = 0;
  let returnedAmount = 0;
  order.items.forEach((item) => {
    const isCancelled = item.itemStatus === "Cancelled";
    const isReturned = item.itemStatus === "Returned";
    if (isCancelled) {
      cancelledAmount += item.subtotal;
    } else if (isReturned) {
      returnedAmount += item.subtotal;
    } else {
      activeSubtotal += item.subtotal;
    }
  });
  // Apply coupon validation logic
  let adjustedDiscount = 0;
  let couponInvalidReason = null;
  if (order.discount > 0 && order.couponCode) {
    const assumedMinPurchase = 1000;
    if (activeSubtotal >= assumedMinPurchase) {
      adjustedDiscount = order.discount;
    } else {
      couponInvalidReason = `Coupon requires minimum ₹${assumedMinPurchase} purchase. Active items: ₹${activeSubtotal.toFixed(2)}`;
    }
  }
  const adjustedShipping = activeSubtotal >= 500 ? 0 : (activeSubtotal > 0 ? order.shippingCharge : 0);
  const adjustedTotal = activeSubtotal + adjustedShipping - adjustedDiscount;
  let itemsHTML = "";
  order.items.forEach((item) => {
    const isCancelled = item.itemStatus === "Cancelled";
    const isReturned = item.itemStatus === "Returned";
    const statusStyle = (isCancelled || isReturned) ? 'color: #6b7280; text-decoration: line-through;' : '';
    const statusBadge = isCancelled ? '<span style="font-size: 10px; color: #dc2626; font-weight: bold;">CANCELLED</span>' : 
                       isReturned ? '<span style="font-size: 10px; color: #ea580c; font-weight: bold;">RETURNED</span>' : '';
    itemsHTML += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${statusStyle}">
          ${item.title}
          ${statusBadge ? `<br>${statusBadge}` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; ${statusStyle}">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; ${statusStyle}">₹${item.price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; ${statusStyle}">₹${item.subtotal.toFixed(2)}</td>
      </tr>
    `;
  });
  let totalsHTML = '';
  if (order.subtotal !== activeSubtotal) {
    totalsHTML += `
      <tr><td colspan="3" style="text-align: right; padding: 8px; font-weight: 500;">Original Subtotal:</td><td style="text-align: right; padding: 8px;">₹${order.subtotal.toFixed(2)}</td></tr>
    `;
    if (cancelledAmount > 0) {
      totalsHTML += `
        <tr><td colspan="3" style="text-align: right; padding: 8px;">Less: Cancelled Items:</td><td style="text-align: right; padding: 8px;">-₹${cancelledAmount.toFixed(2)}</td></tr>
      `;
    }
    if (returnedAmount > 0) {
      totalsHTML += `
        <tr><td colspan="3" style="text-align: right; padding: 8px;">Less: Returned Items:</td><td style="text-align: right; padding: 8px;">-₹${returnedAmount.toFixed(2)}</td></tr>
      `;
    }
    totalsHTML += `
      <tr><td colspan="3" style="text-align: right; padding: 8px; font-weight: 600;">Active Subtotal:</td><td style="text-align: right; padding: 8px; font-weight: 600;">₹${activeSubtotal.toFixed(2)}</td></tr>
    `;
  } else {
    totalsHTML += `
      <tr><td colspan="3" style="text-align: right; padding: 8px; font-weight: 500;">Subtotal:</td><td style="text-align: right; padding: 8px;">₹${activeSubtotal.toFixed(2)}</td></tr>
    `;
  }
  if (adjustedShipping > 0) {
    totalsHTML += `
      <tr><td colspan="3" style="text-align: right; padding: 8px;">Shipping:</td><td style="text-align: right; padding: 8px;">₹${adjustedShipping.toFixed(2)}</td></tr>
    `;
  }
  if (order.discount > 0) {
    if (adjustedDiscount > 0) {
      totalsHTML += `
        <tr><td colspan="3" style="text-align: right; padding: 8px; color: #2e7d32;">Discount (${order.couponCode}):</td><td style="text-align: right; padding: 8px; color: #2e7d32;">-₹${adjustedDiscount.toFixed(2)}</td></tr>
      `;
    } else if (couponInvalidReason) {
      totalsHTML += `
        <tr><td colspan="3" style="text-align: right; padding: 8px; color: #dc2626;">Discount (${order.couponCode}) - Invalid:</td><td style="text-align: right; padding: 8px; color: #dc2626;">₹0.00</td></tr>
        <tr><td colspan="4" style="text-align: center; padding: 8px; font-size: 12px; color: #dc2626;">${couponInvalidReason}</td></tr>
      `;
    }
  }
  totalsHTML += `
    <tr style="border-top: 2px solid #2d1f14;"><td colspan="3" style="text-align: right; padding: 12px; font-weight: bold; font-size: 16px;">Total Amount:</td><td style="text-align: right; padding: 12px; font-weight: bold; font-size: 16px;">₹${adjustedTotal.toFixed(2)}</td></tr>
  `;
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice ${order.orderId}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company-info h1 { margin: 0; font-size: 28px; color: #2d1f14; }
            .invoice-info { text-align: right; }
            .address-section { margin-bottom: 30px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background: #f9fafb; padding: 12px; text-align: left; border: 1px solid #e5e7eb; }
            .items-table td { padding: 12px; border: 1px solid #e5e7eb; }
        </style>
    </head>
    <body>
        <div class="invoice-header">
            <div class="company-info">
                <h1>PAPYRUS</h1>
                <p>Online Bookstore<br>support@papyrus.com</p>
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p>${order.orderId}<br>${invoiceDate}<br>Payment: ${order.paymentStatus}</p>
            </div>
        </div>
        <div class="address-section">
            <strong>BILL TO:</strong><br>
            ${order.shippingAddress.fullName}<br>
            ${order.shippingAddress.addressLine1}<br>
            ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}<br>
            ${order.shippingAddress.phone}
        </div>
        <table class="items-table">
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
                ${totalsHTML}
            </tbody>
        </table>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
            <p><strong>Thank you for shopping with Papyrus!</strong></p>
            <p>For any queries, contact us at support@papyrus.com</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
    </body>
    </html>
  `;
};