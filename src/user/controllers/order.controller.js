import * as orderService from "../../shared/services/order.service.js";

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { orders, total, totalPages, currentPage } =
      await orderService.getUserOrders(userId, { page, limit });

    res.render("user/orders", {
      orders,
      total,
      totalPages,
      currentPage,
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
    const { reason, productIds } = req.body;
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
        message: `Cannot cancel order with order status :${order.orderStatus}`,
      });
    }
    if (productIds && productIds.length > 0) {
      for (const productId of productIds) {
        const item = order.items.find(
          (i) => i.product._id.toString() === productId,
        );
        if (item) {
          await Product.findByIdAndUpdate(productId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    } else {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: item.quantity },
        });
      }
    }

    order.orderStatus = "Cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = reason || "Cancelled by user";
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
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
    const { reason, comments } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      });
    }

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

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      });
    }

    const daysSinceDelivery = Math.floor(
      (new Date() - new Date(order.deliveredAt)) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDelivery > 7) {
      return res.status(400).json({
        success: false,
        message: "Return period has expired (7 days from delivery)",
      });
    }

    order.orderStatus = "Returned";
    order.returnedAt = new Date();
    order.returnReason = reason.trim();
    order.returnComments = comments?.trim() || "";
    await order.save();

    res.json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process return request",
    });
  }
};
