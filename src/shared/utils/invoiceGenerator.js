import PDFDocument from 'pdfkit';

/**
 * Generates a PDF invoice for an order and pipes it to the provided response stream.
 * @param {object} order - Populated order document
 * @param {import('express').Response} res - Express response object
 */
export const generateInvoicePDF = (order, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  const filename = `invoice-${order.orderId}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const colors = {
    dark: '#2d1f14',
    muted: '#6b7280',
    light: '#f9fafb',
    border: '#e5e7eb',
    accent: '#8b7355',
  };

  const pageWidth = doc.page.width - 100; // account for margins

  // ── Header ──────────────────────────────────────────────────────────────────
  doc
    .fontSize(28)
    .font('Helvetica-Bold')
    .fillColor(colors.dark)
    .text('PAPYRUS', 50, 50);

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(colors.muted)
    .text('Online Bookstore', 50, 85)
    .text('support@papyrus.com', 50, 100);

  // Invoice title (right-aligned)
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor(colors.dark)
    .text('INVOICE', 0, 50, { align: 'right' });

  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(colors.muted)
    .text(order.orderId, 0, 80, { align: 'right' })
    .text(invoiceDate, 0, 95, { align: 'right' })
    .text(`Payment: ${order.paymentStatus}`, 0, 110, { align: 'right' });

  // Divider
  doc
    .moveTo(50, 130)
    .lineTo(545, 130)
    .strokeColor(colors.dark)
    .lineWidth(1.5)
    .stroke();

  // ── Addresses ───────────────────────────────────────────────────────────────
  const addrY = 150;

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(colors.muted)
    .text('BILL TO', 50, addrY);

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(colors.dark)
    .text(order.shippingAddress.fullName, 50, addrY + 16);

  const addrLines = [
    order.shippingAddress.addressLine1,
    order.shippingAddress.addressLine2,
    `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`,
    order.shippingAddress.phone,
  ].filter(Boolean);

  doc.fontSize(10).font('Helvetica').fillColor(colors.muted);
  addrLines.forEach((line, i) => {
    doc.text(line, 50, addrY + 32 + i * 15);
  });

  // Payment details (right side)
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(colors.muted)
    .text('PAYMENT DETAILS', 350, addrY);

  const paymentDetails = [
    ['Method', order.paymentMethod],
    ['Status', order.paymentStatus],
    ['Order Status', order.orderStatus],
  ];

  paymentDetails.forEach(([label, value], i) => {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(colors.muted)
      .text(`${label}:`, 350, addrY + 16 + i * 18);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(colors.dark)
      .text(value, 430, addrY + 16 + i * 18);
  });

  // ── Items Table ──────────────────────────────────────────────────────────────
  const tableTop = addrY + 100;
  const colX = { item: 50, qty: 340, price: 400, total: 470 };

  // Table header background
  doc
    .rect(50, tableTop, pageWidth, 28)
    .fill(colors.light);

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(colors.muted)
    .text('ITEM DESCRIPTION', colX.item + 4, tableTop + 9)
    .text('QTY', colX.qty, tableTop + 9, { width: 50, align: 'center' })
    .text('UNIT PRICE', colX.price, tableTop + 9, { width: 60, align: 'right' })
    .text('TOTAL', colX.total, tableTop + 9, { width: 60, align: 'right' });

  // Header bottom border
  doc
    .moveTo(50, tableTop + 28)
    .lineTo(545, tableTop + 28)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();

  let rowY = tableTop + 36;

  order.items.forEach((item) => {
    // Wrap long titles
    const titleHeight = doc.heightOfString(item.title, { width: 270, fontSize: 11 });
    const rowHeight = Math.max(titleHeight + 16, 30);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(colors.dark)
      .text(item.title, colX.item + 4, rowY, { width: 270 });

    doc
      .fontSize(11)
      .text(String(item.quantity), colX.qty, rowY, { width: 50, align: 'center' })
      .text(`Rs.${item.price.toFixed(2)}`, colX.price, rowY, { width: 60, align: 'right' })
      .font('Helvetica-Bold')
      .text(`Rs.${item.subtotal.toFixed(2)}`, colX.total, rowY, { width: 60, align: 'right' });

    rowY += rowHeight;

    // Row divider
    doc
      .moveTo(50, rowY)
      .lineTo(545, rowY)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();

    rowY += 8;

    // Page break if needed
    if (rowY > doc.page.height - 200) {
      doc.addPage();
      rowY = 50;
    }
  });

  // ── Totals ───────────────────────────────────────────────────────────────────
  rowY += 10;
  const totalsX = 350;
  const totalsValueX = 470;

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

    doc
      .fontSize(isTotal ? 13 : 11)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(colors.dark)
      .text(label, totalsX, rowY)
      .text(value, totalsValueX, rowY, { width: 60, align: 'right' });

    rowY += isTotal ? 20 : 18;
  };

  addTotalsRow('Subtotal:', `Rs.${order.subtotal.toFixed(2)}`);

  if (order.shippingCharge > 0) {
    addTotalsRow('Shipping:', `Rs.${order.shippingCharge.toFixed(2)}`);
  }

  if (order.discount > 0) {
    addTotalsRow('Discount:', `-Rs.${order.discount.toFixed(2)}`);
  }

  addTotalsRow('Total Amount:', `Rs.${order.totalAmount.toFixed(2)}`, true, true);

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 80;

  doc
    .moveTo(50, footerY)
    .lineTo(545, footerY)
    .strokeColor(colors.border)
    .lineWidth(0.5)
    .stroke();

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(colors.dark)
    .text('Thank you for shopping with Papyrus!', 50, footerY + 12, { align: 'center' });

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(colors.muted)
    .text('For any queries, contact us at support@papyrus.com', 50, footerY + 28, { align: 'center' })
    .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 43, { align: 'center' });

  doc.end();
};

// Keep the HTML generator for any other use
export const generateInvoiceHTML = (order) => {
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let itemsHTML = '';
  order.items.forEach((item) => {
    itemsHTML += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">₹${item.subtotal.toFixed(2)}</td>
      </tr>
    `;
  });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${order.orderId}</title></head><body>${itemsHTML}</body></html>`;
};
