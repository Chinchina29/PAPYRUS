import * as reviewService from "../../shared/services/review.service.js";
import Order from "../../shared/models/Order.js";

export const addReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to add a review",
      });
    }

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Product, rating, and comment are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
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

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      review,
    });
  } catch (error) {
    return res.status(400).json({
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
    return res.status(500).json({
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
      return res.status(401).json({
        success: false,
        message: "Please login to update review",
      });
    }

    const review = await reviewService.updateReview(reviewId, userId, {
      rating: rating ? parseInt(rating) : undefined,
      title,
      comment,
    });

    return res.json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    return res.status(400).json({
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
      return res.status(401).json({
        success: false,
        message: "Please login to delete review",
      });
    }

    await reviewService.deleteReview(reviewId, userId);

    return res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
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
      message: "Marked as helpful",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
