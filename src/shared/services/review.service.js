import MESSAGES from "../constants/messages.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
export const createReview = async (data) => {
  const existingReview = await Review.findOne({
    product: data.product,
    user: data.user,
    isDeleted: false,
  });
  if (existingReview) {
    throw new Error(MESSAGES.REVIEW.ALREADY_REVIEWED);
  }
  const review = new Review(data);
  await review.save();
  await updateProductRating(data.product);
  return review;
};
export const getProductReviews = async (productId, { page = 1, limit = 10, sort = "newest" }) => {
  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    highest: { rating: -1 },
    lowest: { rating: 1 },
    helpful: { helpfulCount: -1 },
  };
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ product: productId, isDeleted: false })
      .populate("user", "firstName lastName profilePicture")
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ product: productId, isDeleted: false }),
  ]);
  return {
    reviews,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};
export const getUserReviews = async (userId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ user: userId, isDeleted: false })
      .populate("product", "title images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ user: userId, isDeleted: false }),
  ]);
  return {
    reviews,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};
export const updateReview = async (reviewId, userId, data) => {
  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    throw new Error(MESSAGES.REVIEW.NOT_FOUND);
  }
  if (data.rating !== undefined) review.rating = data.rating;
  if (data.title !== undefined) review.title = data.title;
  if (data.comment !== undefined) review.comment = data.comment;
  if (data.images !== undefined) review.images = data.images;
  await review.save();
  await updateProductRating(review.product);
  return review;
};
export const deleteReview = async (reviewId, userId) => {
  const review = await Review.findOne({ _id: reviewId, user: userId });
  if (!review) {
    throw new Error(MESSAGES.REVIEW.NOT_FOUND);
  }
  review.isDeleted = true;
  await review.save();
  await updateProductRating(review.product);
  return review;
};
export const markReviewHelpful = async (reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new Error(MESSAGES.REVIEW.NOT_FOUND);
  }
  review.helpfulCount += 1;
  await review.save();
  return review;
};
export const getReviewStats = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId, isDeleted: false } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);
  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  stats.forEach((stat) => {
    ratingDistribution[stat._id] = stat.count;
  });
  const totalReviews = Object.values(ratingDistribution).reduce((sum, count) => sum + count, 0);
  return {
    ratingDistribution,
    totalReviews,
  };
};
const updateProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId, isDeleted: false });
  if (reviews.length === 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: 0,
      totalReviews: 0,
    });
    return;
  }
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  await Product.findByIdAndUpdate(productId, {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length,
  });
};