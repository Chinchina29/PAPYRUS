import MESSAGES from "../constants/messages.js";
import Coupon from "../models/Coupon.js";
export const createCoupon = async (data) => {
  const existingCoupon = await Coupon.findOne({
    code: data.code.toUpperCase(),
  });
  if (existingCoupon) {
    throw new Error(MESSAGES.CUSTOM.COUPON_CODE_ALREADY_EXISTS);
  }
  const coupon = new Coupon({
    ...data,
    code: data.code.toUpperCase(),
  });
  return await coupon.save();
};
export const getAllCoupons = async ({ search = "", page = 1, limit = 10 }) => {
  const query = {
    isDeleted: false,
    ...(search && { code: { $regex: search, $options: "i" } }),
  };
  const skip = (page - 1) * limit;
  const [coupons, total] = await Promise.all([
    Coupon.find(query)
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Coupon.countDocuments(query),
  ]);
  return {
    coupons,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};
export const getCouponById = async (id) => {
  return await Coupon.findOne({ _id: id, isDeleted: false })
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "title");
};
export const getCouponByCode = async (code) => {
  return await Coupon.findOne({
    code: code.toUpperCase(),
    isDeleted: false,
    isActive: true,
  })
    .populate("applicableCategories")
    .populate("applicableProducts");
};
export const updateCoupon = async (id, data) => {
  if (data.code) {
    data.code = data.code.toUpperCase();
  }
  return await Coupon.findByIdAndUpdate(id, data, { returnDocument: "after" });
};
export const deleteCoupon = async (id) => {
  return await Coupon.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { returnDocument: "after" },
  );
};
export const toggleCouponActive = async (id) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new Error(MESSAGES.CUSTOM.COUPON_NOT_FOUND);
  }
  coupon.isActive = !coupon.isActive;
  return await coupon.save();
};
export const validateCoupon = async (code, userId, cartTotal, cartItems) => {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    throw new Error(MESSAGES.COUPON.INVALID);
  }
  const now = new Date();
  if (now < coupon.validFrom) {
    throw new Error(MESSAGES.CUSTOM.COUPON_IS_NOT_YET_VALID);
  }
  if (now > coupon.validUntil) {
    throw new Error(MESSAGES.COUPON.EXPIRED);
  }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new Error(MESSAGES.COUPON.USAGE_LIMIT_REACHED);
  }
  if (cartTotal < coupon.minPurchaseAmount) {
    throw new Error(
      `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`,
    );
  }
  if (coupon.applicableCategories.length > 0) {
    const hasApplicableProduct = cartItems.some((item) =>
      coupon.applicableCategories.some((cat) => {
        const itemCategoryId = item.product.category._id ? item.product.category._id.toString() : item.product.category.toString();
        return cat._id.toString() === itemCategoryId;
      }),
    );
    if (!hasApplicableProduct) {
      throw new Error(MESSAGES.CUSTOM.COUPON_NOT_APPLICABLE_TO_ITEMS_IN_CART);
    }
  }
  if (coupon.applicableProducts.length > 0) {
    const hasApplicableProduct = cartItems.some((item) =>
      coupon.applicableProducts.some((prod) => {
        const itemProductId = item.product._id ? item.product._id.toString() : item.product.toString();
        return prod._id.toString() === itemProductId;
      }),
    );
    if (!hasApplicableProduct) {
      throw new Error(MESSAGES.CUSTOM.COUPON_NOT_APPLICABLE_TO_ITEMS_IN_CART);
    }
  }
  return coupon;
};
export const calculateDiscount = (coupon, cartTotal) => {
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else if (coupon.discountType === "fixed") {
    discount = coupon.discountValue;
  }
  discount = Math.min(discount, cartTotal);
  return Math.round(discount * 100) / 100;
};
export const getAvailableCoupons = async (userId, cartTotal, cartItems) => {
  const now = new Date();
  const query = {
    isDeleted: false,
    isActive: true,
    $and: [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gte: now } }] },
      {
        $or: [
          { usageLimit: { $exists: false } },
          { usageLimit: null },
          { $expr: { $lt: ["$usageCount", "$usageLimit"] } },
        ],
      },
      {
        $or: [
          { minPurchaseAmount: { $exists: false } },
          { minPurchaseAmount: null },
          { minPurchaseAmount: 0 },
          { minPurchaseAmount: { $lte: cartTotal } },
        ],
      },
    ],
  };
  const coupons = await Coupon.find(query)
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "title")
    .sort({ discountValue: -1 })
    .limit(15);
  const validCoupons = [];
  for (const coupon of coupons) {
    try {
      let isValidForCart = true;
      if (
        (!coupon.applicableCategories ||
          coupon.applicableCategories.length === 0) &&
        (!coupon.applicableProducts || coupon.applicableProducts.length === 0)
      ) {
        isValidForCart = true;
      } else {
        if (
          coupon.applicableCategories &&
          coupon.applicableCategories.length > 0
        ) {
          const hasApplicableProduct = cartItems.some((item) => {
            if (!item.product || !item.product.category) return false;
            return coupon.applicableCategories.some((cat) => {
              const itemCategoryId = item.product.category._id
                ? item.product.category._id.toString()
                : item.product.category.toString();
              return cat._id.toString() === itemCategoryId;
            });
          });
          if (!hasApplicableProduct) {
            isValidForCart = false;
          }
        }
        if (
          isValidForCart &&
          coupon.applicableProducts &&
          coupon.applicableProducts.length > 0
        ) {
          const hasApplicableProduct = cartItems.some((item) =>
            coupon.applicableProducts.some((prod) => {
              const itemProductId = item.product._id ? item.product._id.toString() : item.product.toString();
              return prod._id.toString() === itemProductId;
            }),
          );
          if (!hasApplicableProduct) {
            isValidForCart = false;
          }
        }
      }
      if (isValidForCart) {
        const discount = calculateDiscount(coupon, cartTotal);
        validCoupons.push({
          ...coupon.toObject(),
          potentialDiscount: discount,
        });
      }
    } catch (error) {
      continue;
    }
  }
  return validCoupons;
};
export const getAvailableCouponsSimple = async () => {
  const now = new Date();
  const coupons = await Coupon.find({
    isDeleted: false,
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  })
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "title")
    .sort({ discountValue: -1 })
    .limit(15);
  coupons.forEach((coupon) => {
    });
  return coupons;
};
export const validateCouponForActiveItems = async (
  code,
  userId,
  activeSubtotal,
  cartItems,
) => {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    throw new Error(MESSAGES.COUPON.INVALID);
  }
  const now = new Date();
  if (now < coupon.validFrom) {
    throw new Error(MESSAGES.CUSTOM.COUPON_IS_NOT_YET_VALID);
  }
  if (now > coupon.validUntil) {
    throw new Error(MESSAGES.COUPON.EXPIRED);
  }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new Error(MESSAGES.COUPON.USAGE_LIMIT_REACHED);
  }
  if (activeSubtotal < coupon.minPurchaseAmount) {
    throw new Error(
      `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required for active items. Current active total: ₹${activeSubtotal}`,
    );
  }
  const activeItems = cartItems.filter(
    (item) => item.status !== "Cancelled" && item.status !== "Returned",
  );
  if (coupon.applicableCategories.length > 0) {
    const hasApplicableProduct = activeItems.some((item) =>
      coupon.applicableCategories.some((cat) => {
        const itemCategoryId = item.product.category._id ? item.product.category._id.toString() : item.product.category.toString();
        return cat._id.toString() === itemCategoryId;
      }),
    );
    if (!hasApplicableProduct) {
      throw new Error(MESSAGES.CUSTOM.COUPON_NOT_APPLICABLE_TO_ACTIVE_ITEMS_IN_CART);
    }
  }
  if (coupon.applicableProducts.length > 0) {
    const hasApplicableProduct = activeItems.some((item) =>
      coupon.applicableProducts.some((prod) => {
        const itemProductId = item.product._id ? item.product._id.toString() : item.product.toString();
        return prod._id.toString() === itemProductId;
      }),
    );
    if (!hasApplicableProduct) {
      throw new Error(MESSAGES.CUSTOM.COUPON_NOT_APPLICABLE_TO_ACTIVE_ITEMS_IN_CART);
    }
  }
  return coupon;
};
export const applyCoupon = async (couponId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new Error(MESSAGES.CUSTOM.COUPON_NOT_FOUND);
  }
  coupon.usageCount += 1;
  await coupon.save();
  return coupon;
};
export const markCouponAsUsed = async (couponCode, userId) => {
  const coupon = await getCouponByCode(couponCode);
  if (!coupon) {
    throw new Error(MESSAGES.CUSTOM.COUPON_NOT_FOUND);
  }
  coupon.usageCount = (coupon.usageCount || 0) + 1;
  if (!coupon.usedBy) {
    coupon.usedBy = [];
  }
  if (!coupon.usedBy.includes(userId)) {
    coupon.usedBy.push(userId);
  }
  await coupon.save();
  return coupon;
};
export const checkCouponUsage = async (couponCode, userId) => {
  const coupon = await getCouponByCode(couponCode);
  if (!coupon) {
    return { used: false, reason: "Coupon not found" };
  }
  if (coupon.usedBy && coupon.usedBy.includes(userId)) {
    return { used: true, reason: "Coupon already used by this user" };
  }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { used: true, reason: "Coupon usage limit exceeded" };
  }
  return { used: false };
};
export const removeCouponFromSession = (req) => {
  if (req.session.appliedCoupon) {
    delete req.session.appliedCoupon;
  }
};
export const validateCouponDuringCheckout = async (couponCode, userId, activeSubtotal, cartItems) => {
  const usageCheck = await checkCouponUsage(couponCode, userId);
  if (usageCheck.used) {
    throw new Error(usageCheck.reason);
  }
  return await validateCouponForActiveItems(couponCode, userId, activeSubtotal, cartItems);
};
