import * as reviewService from "../../shared/services/review.service.js";
import { v2 as cloudinary } from "cloudinary";

export const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;

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

    const uploadedImages = [];

    if (images && images.length > 0) {
      for (const base64Image of images) {
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: "papyrus/reviews",
          transformation: [
            { width: 600, height: 600, crop: "limit" },
            { quality: "auto" },
          ],
        });

        uploadedImages.push({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    }

    const review = await reviewService.createReview({
      product: productId,
      user: req.session.userId,
      rating: parseInt(rating),
      title: title?.trim(),
      comment: comment.trim(),
      images: uploadedImages,
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
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

export const getUserReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { reviews, total, totalPages, currentPage } =
      await reviewService.getUserReviews(req.session.userId, { page, limit });

    return res.json({
      success: true,
      reviews,
      total,
      totalPages,
      currentPage,
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
    const { rating, title, comment, images } = req.body;

    const uploadedImages = [];

    if (images && images.length > 0) {
      for (const base64Image of images) {
        if (base64Image.startsWith("data:")) {
          const result = await cloudinary.uploader.upload(base64Image, {
            folder: "papyrus/reviews",
            transformation: [
              { width: 600, height: 600, crop: "limit" },
              { quality: "auto" },
            ],
          });

          uploadedImages.push({
            url: result.secure_url,
            publicId: result.public_id,
          });
        } else {
          uploadedImages.push(base64Image);
        }
      }
    }

    const review = await reviewService.updateReview(
      reviewId,
      req.session.userId,
      {
        rating: rating ? parseInt(rating) : undefined,
        title: title?.trim(),
        comment: comment?.trim(),
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      }
    );

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

    await reviewService.deleteReview(reviewId, req.session.userId);

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

export const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await reviewService.markReviewHelpful(reviewId);

    return res.json({
      success: true,
      message: "Marked as helpful",
      helpfulCount: review.helpfulCount,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
