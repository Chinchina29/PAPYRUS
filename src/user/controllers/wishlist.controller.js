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
    res.status(500).render("error/500");
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const wishlist = await wishlistService.addToWishlist(
      req.session.userId,
      productId
    );

    return res.json({
      success: true,
      message: "Item added to wishlist",
      wishlist: {
        itemCount: wishlist.items.length,
      },
    });
  } catch (error) {
    return res.status(400).json({
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
      message: "Item removed from wishlist",
      wishlist: {
        itemCount: wishlist.items.length,
      },
    });
  } catch (error) {
    return res.status(400).json({
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
      message: "Wishlist cleared successfully",
    });
  } catch (error) {
    return res.status(400).json({
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
    return res.status(500).json({
      success: false,
      message: "Failed to get wishlist count",
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
