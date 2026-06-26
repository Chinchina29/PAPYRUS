import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as reviewService from "../../shared/services/review.service.js";
import Order from "../../shared/models/Order.js";
export const addReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.session.userId;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_LOGIN_TO_ADD_A_REVIEW,
      });
    }
    if (!productId || !rating || !comment) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PRODUCT_RATING_AND_COMMENT_ARE_REQUIRED,
      });
    }
    if (rating < 1 || rating > 5) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.RATING_MUST_BE_BETWEEN_1_AND_5,
      });
    }
    const hasPurchased = await Order.findOne({
      user: userId,
      "items.product": productId,
      orderStatus: { $in: ["delivered", "confirmed", "shipped"] },
    });
    const reviewData = {
      product: productId,
      user: userId,
      rating: parseInt(rating),
      title: title?.trim(),
      comment: comment.trim(),
      isVerifiedPurchase: !!hasPurchased,
    };
    const review = await reviewService.createReview(reviewData);
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.CUSTOM.REVIEW_ADDED_SUCCESSFULLY,
      review,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "newest";
    const { reviews, total, totalPages, currentPage } =
      await reviewService.getProductReviews(productId, { page, limit, sort });
    const stats = await reviewService.getReviewStats(productId);
    return res.json({
      success: true,
      reviews,
      total,
      totalPages,
      currentPage,
      stats,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.session.userId;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_LOGIN_TO_UPDATE_REVIEW,
      });
    }
    const review = await reviewService.updateReview(reviewId, userId, {
      rating: rating ? parseInt(rating) : undefined,
      title,
      comment,
    });
    return res.json({
      success: true,
      message: MESSAGES.REVIEW.UPDATED,
      review,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.session.userId;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_LOGIN_TO_DELETE_REVIEW,
      });
    }
    await reviewService.deleteReview(reviewId, userId);
    return res.json({
      success: true,
      message: MESSAGES.REVIEW.DELETED,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await reviewService.markReviewHelpful(reviewId);
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.MARKED_AS_HELPFUL,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
