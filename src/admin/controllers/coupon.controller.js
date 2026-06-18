import * as couponService from "../../shared/services/coupon.service.js";
import * as categoryService from "../services/category.service.js";
import * as productService from "../../shared/services/product.service.js";
export const getCoupons = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const { coupons, total, totalPages, currentPage } =
      await couponService.getAllCoupons({ search, page, limit });
    res.render("admin/coupons", {
      coupons: coupons || [],
      total: total || 0,
      totalPages: totalPages || 1,
      currentPage: currentPage || 1,
      search: search || "",
      currentPage_name: "coupons",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.render("admin/coupons", {
      coupons: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      search: "",
      currentPage_name: "coupons",
      user: req.session.adminUser,
    });
  }
};
export const getAddCoupon = async (req, res) => {
  try {
    return res.status(501).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Add Coupon - Coming Soon</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f6f3; }
          .message { background: white; padding: 40px; border-radius: 12px; max-width: 500px; margin: 0 auto; }
          h1 { color: #2d2d2d; margin-bottom: 20px; }
          p { color: #6b7280; margin-bottom: 20px; }
          a { display: inline-block; padding: 12px 24px; background: #2d1f14; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="message">
          <h1>🎟️ Add Coupon</h1>
          <p>The coupon management UI is not yet implemented. Backend is ready - please provide Figma design.</p>
          <a href="/admin/coupons">← Back to Coupons</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
export const addCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      perUserLimit,
      validFrom,
      validUntil,
      applicableCategories,
      applicableProducts,
    } = req.body;
    if (!code?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }
    if (!discountType || !discountValue) {
      return res.status(400).json({
        success: false,
        message: "Discount type and value are required",
      });
    }
    if (!validFrom || !validUntil) {
      return res.status(400).json({
        success: false,
        message: "Valid from and until dates are required",
      });
    }
    await couponService.createCoupon({
      code: code.trim(),
      description: description?.trim(),
      discountType,
      discountValue: parseFloat(discountValue),
      minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : 0,
      maxDiscountAmount: maxDiscountAmount
        ? parseFloat(maxDiscountAmount)
        : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      perUserLimit: perUserLimit ? parseInt(perUserLimit) : 1,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
    });
    return res.status(200).json({
      success: true,
      message: "Coupon created successfully",
      redirectUrl: "/admin/coupons",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getEditCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await couponService.getCouponById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    return res.json({
      success: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description || "",
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchaseAmount: coupon.minPurchaseAmount || 0,
        maxDiscountAmount: coupon.maxDiscountAmount || "",
        usageLimit: coupon.usageLimit || "",
        perUserLimit: coupon.perUserLimit || 1,
        validFrom: coupon.validFrom.toISOString().split('T')[0],
        validUntil: coupon.validUntil.toISOString().split('T')[0],
        applicableCategories: coupon.applicableCategories || [],
        applicableProducts: coupon.applicableProducts || [],
        isActive: coupon.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const editCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      perUserLimit,
      validFrom,
      validUntil,
      applicableCategories,
      applicableProducts,
      isActive,
    } = req.body;
    if (!code?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }
    await couponService.updateCoupon(id, {
      code: code.trim(),
      description: description?.trim(),
      discountType,
      discountValue: parseFloat(discountValue),
      minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : 0,
      maxDiscountAmount: maxDiscountAmount
        ? parseFloat(maxDiscountAmount)
        : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      perUserLimit: perUserLimit ? parseInt(perUserLimit) : 1,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      isActive: isActive === true || isActive === "true",
    });
    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      redirectUrl: "/admin/coupons",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await couponService.deleteCoupon(id);
    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const toggleCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await couponService.toggleCouponActive(id);
    return res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? "activated" : "deactivated"} successfully`,
      isActive: coupon.isActive,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }
    const coupon = await couponService.validateCoupon(
      code,
      req.session.userId,
      cartTotal,
      cartItems,
    );
    const discount = couponService.calculateDiscount(coupon, cartTotal);
    return res.json({
      success: true,
      message: "Coupon applied successfully",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discount,
      finalAmount: cartTotal - discount,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};