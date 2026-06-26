import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as orderService from "../../shared/services/order.service.js";
import { generateInvoicePDF } from "../../shared/utils/invoiceGenerator.js";
import * as notificationService from "../../shared/services/notification.service.js";
import Product from "../../shared/models/Product.js";
export const getReturnRequests = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const status = req.query.status !== undefined ? req.query.status : "Requested";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const { orders, total, totalPages, currentPage } =
      await orderService.getReturnRequests({ search, page, limit, status });
    res.render("admin/return-requests", {
      orders: orders || [],
      total: total || 0,
      totalPages: totalPages || 1,
      currentPage: currentPage || 1,
      search: search || "",
      status: status !== undefined ? status : "Requested",
      currentPage_name: "return-requests",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("Get return requests error:", error);
    res.render("admin/return-requests", {
      orders: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      search: "",
      status: "Requested",
      currentPage_name: "return-requests",
      user: req.session.adminUser,
      error: "Failed to load return requests",
    });
  }
};
export const getOrders = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";
    const sort = req.query.sort || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const { orders, total, totalPages, currentPage } =
      await orderService.getAllOrders({ search, page, limit, status, sort });
    res.render("admin/orders", {
      orders: orders || [],
      total: total || 0,
      totalPages: totalPages || 1,
      currentPage: currentPage || 1,
      search: search || "",
      status: status || "",
      sort: sort || "",
      currentPage_name: "orders",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.render("admin/orders", {
      orders: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      search: "",
      status: "",
      sort: "",
      currentPage_name: "orders",
      user: req.session.adminUser,
    });
  }
};
export const getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).render("error/404", {
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    res.render("admin/order-detail", {
      order,
      currentPage_name: "orders",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: MESSAGES.COMMON.INTERNAL_ERROR,
      message: error.message,
    });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.STATUS_IS_REQUIRED,
      });
    }
    const order = await orderService.updateOrderStatus(id, status);
    return res.json({
      success: true,
      message: MESSAGES.ORDER.STATUS_UPDATED,
      order,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PAYMENT_STATUS_IS_REQUIRED,
      });
    }
    const order = await orderService.updatePaymentStatus(id, status);
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.PAYMENT_STATUS_UPDATED_SUCCESSFULLY,
      order,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const order = await orderService.cancelOrder(id, reason);
    return res.json({
      success: true,
      message: MESSAGES.ORDER.CANCELLED,
      order,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const approveReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    if (order.returnRequestStatus !== "Requested") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.NO_PENDING_RETURN_REQUEST_FOR_THIS_ORDER,
      });
    }
    order.returnRequestStatus = "Approved";
    order.returnApprovedAt = new Date();
    order.orderStatus = "Returned";
    order.returnedAt = new Date();
    for (const item of order.items) {
      item.itemStatus = "Returned";
      item.returnRequestStatus = "Approved";
      item.returnedAt = new Date();
      item.returnApprovedAt = new Date();
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { returnDocument: 'after' }
      );
    }
    await order.save();
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.RETURN_REQUEST_APPROVED_SUCCESSFULLY_AND_INVENTORY_RESTORED,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to approve return request",
    });
  }
};
export const rejectReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.REJECTION_REASON_IS_REQUIRED,
      });
    }
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    if (order.returnRequestStatus !== "Requested") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.NO_PENDING_RETURN_REQUEST_FOR_THIS_ORDER,
      });
    }
    order.returnRequestStatus = "Rejected";
    order.returnRejectedAt = new Date();
    order.returnRejectionReason = reason.trim();
    for (const item of order.items) {
      if (item.returnRequestStatus === "None" || item.returnRequestStatus === "Requested") {
        item.returnRequestStatus = "Rejected";
        item.returnRejectedAt = new Date();
        item.returnRejectionReason = reason.trim();
      }
    }
    await order.save();
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.RETURN_REQUEST_REJECTED_SUCCESSFULLY,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to reject return request",
    });
  }
};
export const approveItemReturn = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    const item = order.items.id(itemId);
    if (!item) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CUSTOM.ITEM_NOT_FOUND_IN_ORDER,
      });
    }
    if (item.returnRequestStatus !== "Requested") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.NO_PENDING_RETURN_REQUEST_FOR_THIS_ITEM,
      });
    }
    item.returnRequestStatus = "Approved";
    item.returnApprovedAt = new Date();
    item.itemStatus = "Returned";
    item.returnedAt = new Date();
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } },
      { returnDocument: 'after' }
    );
    let allReturnedOrCancelled = true;
    let hasReturned = false;
    for (const orderItem of order.items) {
      const isCancelled = orderItem.itemStatus === "Cancelled" || orderItem.cancelledAt;
      const isReturned = orderItem.itemStatus === "Returned" || orderItem.returnRequestStatus === "Approved";
      if (!isCancelled && !isReturned) {
        allReturnedOrCancelled = false;
      }
      if (isReturned) {
        hasReturned = true;
      }
    }
    if (allReturnedOrCancelled && hasReturned) {
      order.orderStatus = "Returned";
      order.returnRequestStatus = "Approved";
      order.returnedAt = new Date();
      order.returnApprovedAt = new Date();
    }
    await order.save();
    await notificationService.notifyReturnApproved({
      userId: order.user._id || order.user,
      orderId: order._id,
      itemTitle: item.title,
    });
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.ITEM_RETURN_REQUEST_APPROVED_SUCCESSFULLY_AND_INVENTORY_RESTORED,
    });
  } catch (error) {
    console.error("Approve item return error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to approve item return request",
    });
  }
};
export const rejectItemReturn = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.REJECTION_REASON_IS_REQUIRED,
      });
    }
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    const item = order.items.id(itemId);
    if (!item) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CUSTOM.ITEM_NOT_FOUND_IN_ORDER,
      });
    }
    if (item.returnRequestStatus !== "Requested") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.NO_PENDING_RETURN_REQUEST_FOR_THIS_ITEM,
      });
    }
    item.returnRequestStatus = "Rejected";
    item.returnRejectedAt = new Date();
    item.returnRejectionReason = reason.trim();
    await order.save();
    await notificationService.notifyReturnRejected({
      userId: order.user._id || order.user,
      orderId: order._id,
      itemTitle: item.title,
      reason: reason.trim(),
    });
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.ITEM_RETURN_REQUEST_REJECTED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Reject item return error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to reject item return request",
    });
  }
};
export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER.NOT_FOUND });
    }
    generateInvoicePDF(order, res);
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.CUSTOM.FAILED_TO_GENERATE_INVOICE });
  }
};
