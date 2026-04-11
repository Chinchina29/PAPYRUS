import * as cartService from "../services/cart.service.js";

export const getCart = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.redirect('/login?message=Please log in to access your cart');
    }

    const cart = await cartService.getOrCreateCart(req.session.userId);
    
    res.render("user/cart", {
      cart,
      currentPage_name: "cart",
      user: req.session.user || null,
    });
  } catch (error) {
    res.status(500).render("error/500");
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const cart = await cartService.addToCart(
      req.session.userId,
      productId,
      parseInt(quantity)
    );

    res.json({
      success: true,
      message: "Item added to cart successfully",
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required"
      });
    }

    const cart = await cartService.updateCartItem(
      req.session.userId,
      productId,
      parseInt(quantity)
    );

    res.json({
      success: true,
      message: "Cart updated successfully",
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await cartService.removeFromCart(
      req.session.userId,
      productId
    );

    res.json({
      success: true,
      message: "Item removed from cart",
      cart: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    await cartService.clearCart(req.session.userId);

    res.json({
      success: true,
      message: "Cart cleared successfully"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getCartCount = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({
        success: true,
        count: 0
      });
    }

    const count = await cartService.getCartItemCount(req.session.userId);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get cart count"
    });
  }
};