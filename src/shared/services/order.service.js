import MESSAGES from "../constants/messages.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
export const createOrder = async (data) => {
  const order = new Order(data);
  return await order.save();
};
export const getReturnRequests = async ({
  search = "",
  page = 1,
  limit = 10,
  status = "Requested",
}) => {
  let query = {};
  if (status && status !== "") {
    query.$or = [
      { returnRequestStatus: status },
      { "items.returnRequestStatus": status },
    ];
  } else {
    query.$or = [
      { returnRequestStatus: { $in: ["Requested", "Approved", "Rejected"] } },
      { "items.returnRequestStatus": { $in: ["Requested", "Approved", "Rejected"] } },
    ];
  }
  if (search) {
    query.$and = [
      query.$or ? { $or: query.$or } : {},
      {
        $or: [
          { orderId: { $regex: search, $options: "i" } },
          { "shippingAddress.fullName": { $regex: search, $options: "i" } },
          { "items.title": { $regex: search, $options: "i" } },
        ],
      },
    ];
    delete query.$or;
  }
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("user", "firstName lastName email")
      .populate("items.product", "title images")
      .sort({ returnRequestedAt: -1, "items.returnRequestedAt": -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query),
  ]);
  return {
    orders,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};
export const getAllOrders = async ({
  search = "",
  page = 1,
  limit = 10,
  status = "",
  sort = "",
}) => {
  const query = {
    ...(search && {
      $or: [
        { orderId: { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
      ],
    }),
    ...(status && { orderStatus: status }),
  };
  const sortOptions = {
    "date-desc": { createdAt: -1 },
    "date-asc": { createdAt: 1 },
    "amount-high": { totalAmount: -1 },
    "amount-low": { totalAmount: 1 },
  };
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("user", "firstName lastName email")
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query),
  ]);
  return {
    orders,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};
export const getOrderById = async (id) => {
  return await Order.findById(id)
    .populate("user", "firstName lastName email phone")
    .populate("items.product", "title images");
};
export const getOrderByOrderId = async (orderId) => {
  return await Order.findOne({ orderId })
    .populate("user", "firstName lastName email phone")
    .populate("items.product", "title images");
};
export const getUserOrders = async (
  userId,
  { page = 1, limit = 10, sort = "newest", search = "", status = "" },
) => {
  const skip = (page - 1) * limit;
  const query = { user: userId };
  if (status) {
    query.orderStatus = status;
  }
  if (search) {
    query.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { "items.title": { $regex: search, $options: "i" } },
    ];
  }
  let sortOption = { createdAt: -1 };
  if (sort === "oldest") sortOption = { createdAt: 1 };
  else if (sort === "amount-high") sortOption = { totalAmount: -1 };
  else if (sort === "amount-low") sortOption = { totalAmount: 1 };
  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("items.product", "title images")
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query),
  ]);
  return {
    orders,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};
export const updateOrderStatus = async (id, status) => {
  const order = await Order.findById(id);
  if (!order) {
    throw new Error(MESSAGES.ORDER.NOT_FOUND);
  }
  const statusProgression = {
    "Pending": 1,
    "Processing": 2,
    "Shipped": 3,
    "Delivered": 4,
    "Cancelled": 5,
    "Returned": 6
  };
  const currentStatusLevel = statusProgression[order.orderStatus];
  const newStatusLevel = statusProgression[status];
  if (currentStatusLevel && newStatusLevel && newStatusLevel < currentStatusLevel) {
    if (order.orderStatus === "Delivered" && status !== "Returned") {
      throw new Error(MESSAGES.CUSTOM.CANNOT_ROLLBACK_ORDER_STATUS_FROM_DELIVERED_ONLY_RETURNS_ARE_ALLOWED);
    } else if (order.orderStatus === "Shipped" && status === "Pending") {
      throw new Error(MESSAGES.CUSTOM.CANNOT_ROLLBACK_SHIPPED_ORDER_TO_PENDING_STATUS);
    } else if (order.orderStatus === "Processing" && status === "Pending") {
      throw new Error(MESSAGES.CUSTOM.CANNOT_ROLLBACK_PROCESSING_ORDER_TO_PENDING_STATUS);
    }
  }
  order.orderStatus = status;
  order.items.forEach((item) => {
    if (
      !item.cancelledAt &&
      item.itemStatus !== "Cancelled" &&
      item.itemStatus !== "Returned"
    ) {
      item.itemStatus = status;
    }
  });
  if (status === "Shipped" && !order.shippedAt) {
    order.shippedAt = new Date();
  }
  if (status === "Delivered" && !order.deliveredAt) {
    order.deliveredAt = new Date();
    order.paymentStatus = "Paid";
  }
  if (status === "Cancelled" && !order.cancelledAt) {
    order.cancelledAt = new Date();
  }
  return await order.save();
};
export const updatePaymentStatus = async (id, status) => {
  return await Order.findByIdAndUpdate(
    id,
    { paymentStatus: status },
    { returnDocument: "after" },
  );
};
export const cancelOrder = async (id, reason) => {
  const order = await Order.findById(id);
  if (!order) {
    throw new Error(MESSAGES.ORDER.NOT_FOUND);
  }
  if (order.orderStatus === "Delivered") {
    throw new Error(MESSAGES.CUSTOM.CANNOT_CANCEL_DELIVERED_ORDER);
  }
  if (order.orderStatus === "Cancelled") {
    throw new Error(MESSAGES.ORDER.ALREADY_CANCELLED);
  }
  order.orderStatus = "Cancelled";
  order.cancelledAt = new Date();
  order.cancellationReason = reason;
  return await order.save();
};
export const getOrderStats = async () => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);
  const totalOrders = await Order.countDocuments();
  const totalRevenue = await Order.aggregate([
    { $match: { paymentStatus: "Paid" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  return {
    stats,
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
  };
};
