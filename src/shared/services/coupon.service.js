import Coupon from "../models/Coupon.js";

export const createCoupon = async (data) => {
  const existingCoupon = await Coupon.findOne({ code: data.code.toUpperCase() });

  if (existingCoupon) {
    throw new Error("Coupon code already exists");
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
    { returnDocument: "after" }
  );
};

export const toggleCouponActive = async (id) => {
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  coupon.isActive = !coupon.isActive;
  return await coupon.save();
};

export const validateCoupon = async (code, userId, cartTotal, cartItems) => {
  const coupon = await getCouponByCode(code);

  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  const now = new Date();
  if (now < coupon.validFrom) {
    throw new Error("Coupon is not yet valid");
  }

  if (now > coupon.validUntil) {
    throw new Error("Coupon has expired");
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }

  if (cartTotal < coupon.minPurchaseAmount) {
    throw new Error(
      `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`
    );
  }

  if (coupon.applicableCategories.length > 0) {
    const hasApplicableProduct = cartItems.some((item) =>
      coupon.applicableCategories.some(
        (cat) => cat._id.toString() === item.product.category.toString()
      )
    );

    if (!hasApplicableProduct) {
      throw new Error("Coupon not applicable to items in cart");
    }
  }

  if (coupon.applicableProducts.length > 0) {
    const hasApplicableProduct = cartItems.some((item) =>
      coupon.applicableProducts.some(
        (prod) => prod._id.toString() === item.product._id.toString()
      )
    );

    if (!hasApplicableProduct) {
      throw new Error("Coupon not applicable to items in cart");
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

export const applyCoupon = async (couponId) => {
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  coupon.usageCount += 1;
  await coupon.save();

  return coupon;
};
