import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import Order from "../../shared/models/Order.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import path from "path";
const getDateRange = (filter, startDate, endDate) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();
  switch (filter) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
      break;
    default:
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
};
const getReportData = async (filter, customStartDate, customEndDate) => {
  const { start, end } = getDateRange(filter, customStartDate, customEndDate);
  const matchQuery = {
    orderStatus: "Delivered",
    createdAt: { $gte: start, $lte: end }
  };
  const orders = await Order.find(matchQuery)
    .populate("user", "firstName lastName email")
    .sort({ createdAt: -1 });
  let totalSalesCount = orders.length;
  let totalOrderAmount = 0;
  let totalDiscount = 0;
  orders.forEach(order => {
    totalOrderAmount += order.totalAmount || 0;
    totalDiscount += order.discount || 0;
  });
  return { orders, metrics: { totalSalesCount, totalOrderAmount, totalDiscount }, start, end };
};
export const getSalesReport = async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const data = await getReportData(filter, startDate, endDate);
    const { metrics, start, end } = data;
    const total = data.orders.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedOrders = data.orders.slice((page - 1) * limit, page * limit);
    res.render("admin/reports", {
      orders: paginatedOrders,
      metrics,
      filter,
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      currentPage: page,
      totalPages,
      total,
      currentPage_name: "reports",
      title: "Sales Reports",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("admin/reports", {
      orders: [],
      metrics: { totalSalesCount: 0, totalOrderAmount: 0, totalDiscount: 0 },
      filter: 'all',
      startDate: '',
      endDate: '',
      currentPage: 1,
      totalPages: 1,
      total: 0,
      currentPage_name: "reports",
      title: "Sales Reports",
      user: req.session.adminUser,
      error: "Failed to load sales report.",
    });
  }
};
export const downloadPdfReport = async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const { startDate, endDate } = req.query;
    const { orders, metrics, start, end } = await getReportData(filter, startDate, endDate);
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Sales_Report_${filter}.pdf`);
    doc.pipe(res);
    doc.fontSize(20).text('Papyrus Sales Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date Range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(14).text('Summary');
    doc.fontSize(10).text(`Total Sales Count: ${metrics.totalSalesCount}`);
    doc.text(`Total Order Amount: ${metrics.totalOrderAmount.toFixed(2)} INR`);
    doc.text(`Total Coupon/Discounts: ${metrics.totalDiscount.toFixed(2)} INR`);
    doc.moveDown();
    let y = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Order ID', 30, y, { width: 100 });
    doc.text('Date', 130, y, { width: 100 });
    doc.text('Customer', 230, y, { width: 150 });
    doc.text('Discount (INR)', 380, y, { width: 80 });
    doc.text('Total (INR)', 460, y, { width: 80 });
    doc.font('Helvetica');
    y += 20;
    doc.moveTo(30, y - 5).lineTo(560, y - 5).stroke();
    orders.forEach(order => {
      if (y > 750) {
        doc.addPage();
        y = 30;
      }
      doc.text(order.orderId || order._id.toString().substring(0, 8), 30, y, { width: 100 });
      doc.text(new Date(order.createdAt).toLocaleDateString(), 130, y, { width: 100 });
      const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest';
      doc.text(customerName, 230, y, { width: 150 });
      doc.text((order.discount || 0).toFixed(2), 380, y, { width: 80 });
      doc.text((order.totalAmount || 0).toFixed(2), 460, y, { width: 80 });
      y += 20;
    });
    doc.end();
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error generating PDF report");
  }
};
export const downloadExcelReport = async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const { startDate, endDate } = req.query;
    const { orders, metrics, start, end } = await getReportData(filter, startDate, endDate);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    worksheet.mergeCells('A1', 'F1');
    worksheet.getCell('A1').value = 'Papyrus Sales Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.mergeCells('A2', 'F2');
    worksheet.getCell('A2').value = `Date Range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
    worksheet.getCell('A4').value = 'Total Sales Count';
    worksheet.getCell('B4').value = metrics.totalSalesCount;
    worksheet.getCell('A5').value = 'Total Order Amount (INR)';
    worksheet.getCell('B5').value = metrics.totalOrderAmount;
    worksheet.getCell('A6').value = 'Total Coupon/Discounts (INR)';
    worksheet.getCell('B6').value = metrics.totalDiscount;
    worksheet.getRow(8).values = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Discount (INR)', 'Total Amount (INR)'];
    worksheet.getRow(8).font = { bold: true };
    let rowIndex = 9;
    orders.forEach(order => {
      const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest';
      const customerEmail = order.user ? order.user.email : 'N/A';
      worksheet.getRow(rowIndex).values = [
        order.orderId || order._id.toString(),
        new Date(order.createdAt).toLocaleDateString(),
        customerName,
        customerEmail,
        order.discount || 0,
        order.totalAmount || 0
      ];
      rowIndex++;
    });
    worksheet.columns = [
      { key: 'orderId', width: 20 },
      { key: 'date', width: 15 },
      { key: 'name', width: 25 },
      { key: 'email', width: 30 },
      { key: 'discount', width: 15 },
      { key: 'total', width: 18 }
    ];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Sales_Report_${filter}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error generating Excel report");
  }
};
