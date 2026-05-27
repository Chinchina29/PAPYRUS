import * as orderService from "../../shared/services/order.service.js";
import { generateInvoicePDF } from "../../shared/utils/invoiceGenerator.js";
import * as notificationService from "../../shared/services/notification.service.js";

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
      return res.status(404).render("error/404", {
        message: "Order not found",
      });
    }

    res.render("admin/order-detail", {
      order,
      currentPage_name: "orders",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const order = await orderService.updateOrderStatus(id, status);

    return res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        message: "Payment status is required",
      });
    }

    const order = await orderService.updatePaymentStatus(id, status);

    return res.json({
      success: true,
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    return res.status(400).json({
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
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    return res.status(400).json({
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
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.returnRequestStatus !== "Requested") {
      return res.status(400).json({
        success: false,
        message: "No pending return request for this order",
      });
    }

    order.returnRequestStatus = "Approved";
    order.returnApprovedAt = new Date();
    order.orderStatus = "Returned";
    order.returnedAt = new Date();
    await order.save();

    return res.json({
      success: true,
      message: "Return request approved successfully",
    });
  } catch (error) {
    return res.status(500).json({
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
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.returnRequestStatus !== "Requested") {
      return res.status(400).json({
        success: false,
        message: "No pending return request for this order",
      });
    }

    order.returnRequestStatus = "Rejected";
    order.returnRejectedAt = new Date();
    order.returnRejectionReason = reason.trim();
    await order.save();

    return res.json({
      success: true,
      message: "Return request rejected successfully",
    });
  } catch (error) {
    return res.status(500).json({
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
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in order",
      });
    }

    if (item.returnRequestStatus !== "Requested") {
      return res.status(400).json({
        success: false,
        message: "No pending return request for this item",
      });
    }

    item.returnRequestStatus = "Approved";
    item.returnApprovedAt = new Date();
    item.itemStatus = "Returned";
    item.returnedAt = new Date();

    await order.save();

    await notificationService.notifyReturnApproved({
      userId: order.user._id || order.user,
      orderId: order._id,
      itemTitle: item.title,
    });

    return res.json({
      success: true,
      message: "Item return request approved successfully",
    });
  } catch (error) {
    console.error("Approve item return error:", error);
    return res.status(500).json({
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
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in order",
      });
    }

    if (item.returnRequestStatus !== "Requested") {
      return res.status(400).json({
        success: false,
        message: "No pending return request for this item",
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
      message: "Item return request rejected successfully",
    });
  } catch (error) {
    console.error("Reject item return error:", error);
    return res.status(500).json({
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
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    generateInvoicePDF(order, res);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to generate invoice" });
  }
};
