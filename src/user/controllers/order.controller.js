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
      return res.redirect("/orders?error=Order not found. Please check your order history");
    }

    if (order.user._id.toString() !== userId.toString()) {
      return res.redirect("/orders?error=You do not have permission to view this order");
    }

    res.render("user/order-detail", {
      order,
      currentPage_name: "orders",
      user: req.session.user || null,
    });
  } catch (error) {
    res.redirect("/orders?error=An error occurred while loading your order details");
  }
};
