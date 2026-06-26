import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as wishlistService from "../../shared/services/wishlist.service.js";
export const getWishlist = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.redirect('/login?message=Please log in to access your wishlist');
    }
    const wishlist = await wishlistService.getOrCreateWishlist(req.session.userId);
    res.render("user/wishlist", {
      wishlist,
      currentPage_name: "wishlist",
      user: req.session.user || null,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error/500");
  }
};
export const addToWishlist = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.PLEASE_LOG_IN_TO_ADD_ITEMS_TO_YOUR_WISHLIST,
        requiresLogin: true
      });
    }
    const { productId } = req.body;
    if (!productId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PRODUCT_ID_IS_REQUIRED,
      });
    }
    const wishlist = await wishlistService.addToWishlist(
      req.session.userId,
      productId
    );
    return res.json({
      success: true,
      message: MESSAGES.WISHLIST.ADDED,
      wishlist: {
        itemCount: wishlist.items.length,
      },
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlist = await wishlistService.removeFromWishlist(
      req.session.userId,
      productId
    );
    return res.json({
      success: true,
      message: MESSAGES.WISHLIST.REMOVED,
      wishlist: {
        itemCount: wishlist.items.length,
      },
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const clearWishlist = async (req, res) => {
  try {
    await wishlistService.clearWishlist(req.session.userId);
    return res.json({
      success: true,
      message: MESSAGES.CUSTOM.WISHLIST_CLEARED_SUCCESSFULLY,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
export const getWishlistCount = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({
        success: true,
        count: 0,
      });
    }
    const count = await wishlistService.getWishlistItemCount(req.session.userId);
    return res.json({
      success: true,
      count,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_GET_WISHLIST_COUNT,
    });
  }
};
export const checkWishlistStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const isInWishlist = await wishlistService.isInWishlist(
      req.session.userId,
      productId
    );
    return res.json({
      success: true,
      isInWishlist,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};