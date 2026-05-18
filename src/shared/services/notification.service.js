import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * Create a notification for a user
 */
export const createNotification = async ({ userId, type, title, message, relatedOrder, relatedProduct }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      relatedOrder,
      relatedProduct,
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Create notification for return request approved
 */
export const notifyReturnApproved = async ({ userId, orderId, itemTitle }) => {
  return createNotification({
    userId,
    type: "return_approved",
    title: "Return Request Approved",
    message: itemTitle 
      ? `Your return request for "${itemTitle}" has been approved.`
      : "Your return request has been approved.",
    relatedOrder: orderId,
  });
};

/**
 * Create notification for return request rejected
 */
export const notifyReturnRejected = async ({ userId, orderId, itemTitle, reason }) => {
  return createNotification({
    userId,
    type: "return_rejected",
    title: "Return Request Rejected",
    message: itemTitle
      ? `Your return request for "${itemTitle}" has been rejected. Reason: ${reason}`
      : `Your return request has been rejected. Reason: ${reason}`,
    relatedOrder: orderId,
  });
};

/**
 * Create notification for product out of stock
 */
export const notifyProductOutOfStock = async ({ userId, productId, productTitle }) => {
  return createNotification({
    userId,
    type: "product_out_of_stock",
    title: "Product Out of Stock",
    message: `"${productTitle}" is now out of stock.`,
    relatedProduct: productId,
  });
};

/**
 * Notify all admins about new return request
 */
export const notifyAdminsReturnRequest = async ({ orderId, customerName, itemTitle }) => {
  try {
    // Get all admin users
    const admins = await User.find({ role: "admin" });
    
    const notifications = admins.map(admin =>
      createNotification({
        userId: admin._id,
        type: "return_request_submitted",
        title: "New Return Request",
        message: itemTitle
          ? `${customerName} submitted a return request for "${itemTitle}".`
          : `${customerName} submitted a return request.`,
        relatedOrder: orderId,
      })
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error("Error notifying admins:", error);
    throw error;
  }
};

/**
 * Get unread notifications for a user
 */
export const getUnreadNotifications = async (userId) => {
  return Notification.find({ user: userId, isRead: false })
    .populate("relatedOrder", "orderId")
    .populate("relatedProduct", "title")
    .sort({ createdAt: -1 })
    .limit(10);
};

/**
 * Get all notifications for a user with pagination
 */
export const getUserNotifications = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ user: userId })
      .populate("relatedOrder", "orderId")
      .populate("relatedProduct", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ user: userId }),
  ]);

  return {
    notifications,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    unreadCount: await Notification.countDocuments({ user: userId, isRead: false }),
  };
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  return Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId, userId) => {
  return Notification.findOneAndDelete({ _id: notificationId, user: userId });
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ user: userId, isRead: false });
};
