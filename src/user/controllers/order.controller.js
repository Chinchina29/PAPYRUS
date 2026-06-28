import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as orderService from "../../shared/services/order.service.js";
import Product from "../../shared/models/Product.js";
import { generateInvoicePDF } from "../../shared/utils/invoiceGenerator.js";
import * as notificationService from "../../shared/services/notification.service.js";
import User from "../../shared/models/User.js";
import WalletTransaction from "../../shared/models/WalletTransaction.js";
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const sort = req.query.sort || "newest";
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";
    const { orders, total, totalPages, currentPage } =
      await orderService.getUserOrders(userId, {
        page,
        limit,
        sort,
        search,
        status,
      });
    res.render("user/orders", {
      orders,
      total,
      totalPages,
      currentPage,
      sort,
      search,
      status,
      currentPage_name: "orders",
      user: req.session.user || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.redirect("/home?error=An error occurred while loading your orders");
  }
};
export const getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.redirect(
        "/orders?error=Order not found. Please check your order history",
      );
    }
    if (order.user._id.toString() !== userId.toString()) {
      return res.redirect(
        "/orders?error=You do not have permission to view this order",
      );
    }
    res.render("user/order-detail", {
      order,
      currentPage_name: "orders",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect(
      "/orders?error=An error occurred while loading your order details",
    );
  }
};
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { orderId } = req.params;
    const { reason, comments, productIds } = req.body;
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    if (order.user._id.toString() !== userId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.COMMON.UNAUTHORIZED,
      });
    }
    if (["Delivered", "Cancelled", "Returned"].includes(order.orderStatus)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Cannot cancel order with status: ${order.orderStatus}`,
      });
    }
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      let allItemsCancelled = true;
      let cancelledCount = 0;
      for (const item of order.items) {
        const itemId = item._id.toString();
        if (productIds.includes(itemId)) {
          if (item.itemStatus === "Cancelled" || item.cancelledAt) {
            continue;
          }
          if (
            ["Delivered", "Shipped", "Returned"].includes(
              item.itemStatus || order.orderStatus,
            )
          ) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: `Cannot cancel item "${item.title}" with status: ${item.itemStatus || order.orderStatus}`,
            });
          }
          item.itemStatus = "Cancelled";
          item.cancelledAt = new Date();
          item.cancellationReason = reason || "Cancelled by user";
          if (comments) {
            item.cancellationReason += ` - ${comments}`;
          }
          await Product.findByIdAndUpdate(item.product._id, {
            $inc: { stock: item.quantity },
          });
          cancelledCount++;
        } else {
          if (item.itemStatus !== "Cancelled" && !item.cancelledAt) {
            allItemsCancelled = false;
          }
        }
      }
      if (cancelledCount === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.NO_ITEMS_WERE_CANCELLED_THEY_MAY_ALREADY_BE_CANCELLED_OR_IN_A_NON_CANCELLABLE_STATE,
        });
      }
      if (allItemsCancelled) {
        order.orderStatus = "Cancelled";
        order.cancelledAt = new Date();
        order.cancellationReason = "All items cancelled";
      }
      let refundAmount = 0;
      if (order.paymentStatus === "Paid") {
        for (const item of order.items) {
          if (productIds.includes(item._id.toString()) && item.itemStatus === "Cancelled") {
            refundAmount += (item.subtotal || item.price * item.quantity);
          }
        }
        if (allItemsCancelled) {
          refundAmount = order.totalAmount;
          order.paymentStatus = 'Refunded';
        }
      }
      if (refundAmount > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: refundAmount } });
        await WalletTransaction.create({
          user: userId,
          type: 'credit',
          amount: refundAmount,
          description: `Refund for cancelled items (Order: ${order.orderId})`,
          orderId: order._id
        });
      }
      await order.save();
      return res.json({
        success: true,
        message:
          cancelledCount === 1
            ? "Item cancelled successfully" + (refundAmount > 0 ? " and amount refunded to wallet." : "")
            : `${cancelledCount} items cancelled successfully` + (refundAmount > 0 ? " and amount refunded to wallet." : ""),
      });
    }
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: item.quantity },
      });
      item.itemStatus = "Cancelled";
      item.cancelledAt = new Date();
      item.cancellationReason = reason || "Cancelled by user";
      if (comments) {
        item.cancellationReason += ` - ${comments}`;
      }
    }
    order.orderStatus = "Cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = reason || "Cancelled by user";
    if (comments) {
      order.cancellationReason += ` - ${comments}`;
    }
    let refundAmount = 0;
    if (order.paymentStatus === "Paid") {
      refundAmount = order.totalAmount;
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: refundAmount } });
      await WalletTransaction.create({
        user: userId,
        type: 'credit',
        amount: refundAmount,
        description: `Refund for cancelled order (${order.orderId})`,
        orderId: order._id
      });
      order.paymentStatus = 'Refunded';
    }
    await order.save();
    res.json({
      success: true,
      message: MESSAGES.ORDER.CANCELLED + (refundAmount > 0 ? " Amount refunded to wallet." : ""),
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_CANCEL_ORDER,
    });
  }
};
export const returnOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { orderId } = req.params;
    const { reason, comments, productIds } = req.body;
    console.log("Return request received:", {
      orderId,
      userId,
      reason,
      productIds,
    });
    if (!reason || !reason.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.RETURN_REASON_IS_REQUIRED,
      });
    }
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      console.log("Order not found:", orderId);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    if (order.user._id.toString() !== userId.toString()) {
      console.log("Unauthorized access:", {
        orderUser: order.user._id,
        requestUser: userId,
      });
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.COMMON.UNAUTHORIZED,
      });
    }
    console.log("Order status:", order.orderStatus);
    if (order.orderStatus !== "Delivered") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Only delivered orders can be returned. Current status: ${order.orderStatus}`,
      });
    }
    if (!order.deliveredAt) {
      console.log("Order has no deliveredAt date");
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.ORDER_DELIVERY_DATE_NOT_FOUND,
      });
    }
    const daysSinceDelivery = Math.floor(
      (new Date() - new Date(order.deliveredAt)) / (1000 * 60 * 60 * 24),
    );
    console.log("Days since delivery:", daysSinceDelivery);
    if (daysSinceDelivery > 7) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.RETURN_PERIOD_HAS_EXPIRED_7_DAYS_FROM_DELIVERY,
      });
    }
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      console.log("Processing item-level return for items:", productIds);
      let returnedCount = 0;
      for (const item of order.items) {
        const itemId = item._id.toString();
        if (productIds.includes(itemId)) {
          console.log(
            "Processing item:",
            itemId,
            "Status:",
            item.itemStatus,
            "Return status:",
            item.returnRequestStatus,
          );
          if (item.returnRequestStatus === "Requested") {
            console.log("Item already has pending return request");
            continue;
          }
          if (item.returnRequestStatus === "Approved") {
            console.log("Item return already approved");
            continue;
          }
          const effectiveStatus = item.itemStatus || order.orderStatus;
          console.log("Effective item status:", effectiveStatus);
          if (effectiveStatus !== "Delivered") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: `Cannot return item "${item.title}" with status: ${effectiveStatus}`,
            });
          }
          item.returnRequestStatus = "Requested";
          item.returnRequestedAt = new Date();
          item.returnReason = reason.trim();
          item.returnComments = comments?.trim() || "";
          returnedCount++;
          console.log("Item marked for return:", itemId);
        }
      }
      if (returnedCount === 0) {
        console.log("No items were marked for return");
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.NO_ITEMS_WERE_MARKED_FOR_RETURN_THEY_MAY_ALREADY_HAVE_PENDING_RETURN_REQUESTS,
        });
      }
      await order.save();
      console.log("Order saved with", returnedCount, "items marked for return");
      const itemTitles = order.items
        .filter((item) => productIds.includes(item._id.toString()))
        .map((item) => item.title)
        .join(", ");
      await notificationService.notifyAdminsReturnRequest({
        orderId: order._id,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        itemTitle: itemTitles,
      });
      return res.json({
        success: true,
        message:
          returnedCount === 1
            ? "Return request submitted successfully for the item. Awaiting admin approval."
            : `Return requests submitted successfully for ${returnedCount} items. Awaiting admin approval.`,
      });
    }
    console.log("Processing full order return");
    if (order.returnRequestStatus === "Requested") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.RETURN_REQUEST_ALREADY_SUBMITTED_AND_PENDING_APPROVAL,
      });
    }
    if (order.returnRequestStatus === "Approved") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.RETURN_REQUEST_ALREADY_APPROVED,
      });
    }
    order.returnRequestStatus = "Requested";
    order.returnRequestedAt = new Date();
    order.returnReason = reason.trim();
    order.returnComments = comments?.trim() || "";
    for (const item of order.items) {
      if (item.returnRequestStatus === "None" && item.itemStatus !== "Cancelled") {
        item.returnRequestStatus = "Requested";
        item.returnRequestedAt = new Date();
        item.returnReason = reason.trim();
        item.returnComments = comments?.trim() || "";
      }
    }
    await order.save();
    console.log("Full order return request saved");
    await notificationService.notifyAdminsReturnRequest({
      orderId: order._id,
      customerName: `${order.user.firstName} ${order.user.lastName}`,
      itemTitle: null,
    });
    res.json({
      success: true,
      message: MESSAGES.CUSTOM.RETURN_REQUEST_SUBMITTED_SUCCESSFULLY_AWAITING_ADMIN_APPROVAL,
    });
  } catch (error) {
    console.error("Return order error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to process return request",
    });
  }
};
export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ORDER.NOT_FOUND,
      });
    }
    if (order.user._id.toString() !== userId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.COMMON.UNAUTHORIZED,
      });
    }
    generateInvoicePDF(order, res);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_GENERATE_INVOICE,
    });
  }
};
