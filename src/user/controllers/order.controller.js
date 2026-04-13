import * as orderService from "../../shared/services/order.service.js";

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { orders, total, totalPages, currentPage } = await orderService.getUserOrders(userId, { page, limit });

    res.render("user/orders", {
      orders,
      total,
      totalPages,
      currentPage,
      currentPage_name: "orders",
      user: req.session.user || null,
    });
  } catch (error) {
    res.status(500).render("error/500");
  }
};

export const getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).render("error/404", {
        message: "Order not found",
      });
    }

    // Verify the order belongs to the user
    if (order.user._id.toString() !== userId.toString()) {
      return res.status(403).render("error/403", {
        message: "Access denied",
      });
    }

    res.render("user/order-detail", {
      order,
      currentPage_name: "orders",
      user: req.session.user || null,
    });
  } catch (error) {
    res.status(500).render("error/500");
  }
};
