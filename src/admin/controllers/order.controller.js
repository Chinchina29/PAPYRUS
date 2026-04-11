import * as orderService from "../../shared/services/order.service.js";

export const getOrders = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { orders, total, totalPages, currentPage } =
      await orderService.getAllOrders({ search, page, limit, status });

    res.render("admin/orders", {
      orders: orders || [],
      total: total || 0,
      totalPages: totalPages || 1,
      currentPage: currentPage || 1,
      search: search || "",
      status: status || "",
      currentPage_name: "orders",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.render("admin/orders", {
      orders: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      search: "",
      status: "",
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
