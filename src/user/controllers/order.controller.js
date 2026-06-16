import * as orderService from "../../shared/services/order.service.js";
import Product from "../../shared/models/Product.js";
import { generateInvoicePDF } from "../../shared/utils/invoiceGenerator.js";
import * as notificationService from "../../shared/services/notification.service.js";

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
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (["Delivered", "Cancelled", "Returned"].includes(order.orderStatus)) {
      return res.status(400).json({
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
            return res.status(400).json({
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
        return res.status(400).json({
          success: false,
          message:
            "No items were cancelled. They may already be cancelled or in a non-cancellable state.",
        });
      }

      if (allItemsCancelled) {
        order.orderStatus = "Cancelled";
        order.cancelledAt = new Date();
        order.cancellationReason = "All items cancelled";
      }

      await order.save();

      return res.json({
        success: true,
        message:
          cancelledCount === 1
            ? "Item cancelled successfully"
            : `${cancelledCount} items cancelled successfully`,
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

    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
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
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      });
    }

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      console.log("Order not found:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user._id.toString() !== userId.toString()) {
      console.log("Unauthorized access:", {
        orderUser: order.user._id,
        requestUser: userId,
      });
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    console.log("Order status:", order.orderStatus);

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: `Only delivered orders can be returned. Current status: ${order.orderStatus}`,
      });
    }

    if (!order.deliveredAt) {
      console.log("Order has no deliveredAt date");
      return res.status(400).json({
        success: false,
        message: "Order delivery date not found",
      });
    }

    const daysSinceDelivery = Math.floor(
      (new Date() - new Date(order.deliveredAt)) / (1000 * 60 * 60 * 24),
    );

    console.log("Days since delivery:", daysSinceDelivery);

    if (daysSinceDelivery > 7) {
      return res.status(400).json({
        success: false,
        message: "Return period has expired (7 days from delivery)",
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
            return res.status(400).json({
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
        return res.status(400).json({
          success: false,
          message:
            "No items were marked for return. They may already have pending return requests.",
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
      return res.status(400).json({
        success: false,
        message: "Return request already submitted and pending approval",
      });
    }

    if (order.returnRequestStatus === "Approved") {
      return res.status(400).json({
        success: false,
        message: "Return request already approved",
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
      message:
        "Return request submitted successfully. Awaiting admin approval.",
    });
  } catch (error) {
    console.error("Return order error:", error);
    res.status(500).json({
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
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    generateInvoicePDF(order, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice",
    });
  }
};
