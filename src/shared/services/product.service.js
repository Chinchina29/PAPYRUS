import Product from "../models/Product.js";

export const getAllProducts = async ({
  search = "",
  page = 1,
  limit = 10,
  showDeleted = false,
  sort = "",
  category = "",
  minPrice = "",
  maxPrice = "",
  condition = "",
  status = "",
  stock = "",
}) => {
  const query = {
    ...(showDeleted ? {} : { isDeleted: false }),
    ...(search && {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ],
    }),
    ...(category && { category }),
    ...(condition && { condition }),
    ...(status === "listed" && { isListed: true }),
    ...(status === "unlisted" && { isListed: false }),
    ...((minPrice || maxPrice) && {
      price: {
        ...(minPrice && { $gte: parseFloat(minPrice) }),
        ...(maxPrice && { $lte: parseFloat(maxPrice) }),
      },
    }),
    ...(stock === "in-stock" && { stock: { $gt: 0 } }),
    ...(stock === "out-of-stock" && { stock: 0 }),
    ...(stock === "low-stock" && { stock: { $gt: 0, $lte: 5 } }),
  };

  const sortOptions = {
    "date-desc": { createdAt: -1 },
    "date-asc": { createdAt: 1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    "title-asc": { title: 1 },
    "title-desc": { title: -1 },
    "stock-asc": { stock: 1 },
    "stock-desc": { stock: -1 },
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
      .populate("seller", "firstName lastName email")
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  return {
    products,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

export const getProductById = async (id) => {
  return await Product.findOne({ _id: id, isDeleted: false })
    .populate("category", "name")
    .populate("subcategory", "name")
    .populate("seller", "firstName lastName email");
};

export const productTitleExists = async (title, excludeId = null) => {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {
    title: { $regex: `^${escapedTitle}$`, $options: "i" },
    isDeleted: false,
  };
  if (excludeId) query._id = { $ne: excludeId };
  return await Product.findOne(query);
};

export const createProduct = async (data) => {
  const product = new Product(data);
  return await product.save();
};

export const updateProduct = async (id, data) => {
  return await Product.findByIdAndUpdate(id, data, { returnDocument: "after" });
};

export const softDeleteProduct = async (id) => {
  return await Product.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { returnDocument: "after" },
  );
};

export const toggleProductListed = async (id) => {
  const product = await Product.findById(id);
  if (!product) return null;
  product.isListed = !product.isListed;
  return await product.save();
};

export const getListedProducts = async ({
  search = "",
  page = 1,
  limit = 12,
  sort = "newest",
  category = "",
  minPrice = "",
  maxPrice = "",
  condition = "",
  brand = "",
  userId = null,
}) => {
  const query = {
    isDeleted: false,
    isListed: true,
  };

  if (userId) {
    query.seller = { $ne: userId };
  }

  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (category) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [{ category }, { subcategory: category }],
    });
  }

  if (condition) query.condition = condition;
  if (brand) query.brand = { $regex: brand, $options: "i" };
  if (minPrice || maxPrice) {
    query.price = {
      ...(minPrice && { $gte: parseFloat(minPrice) }),
      ...(maxPrice && { $lte: parseFloat(maxPrice) }),
    };
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    "price-low": { price: 1 },
    "price-high": { price: -1 },
    "a-z": { title: 1 },
    "z-a": { title: -1 },
    popular: { views: -1 },
  };

  const skip = (page - 1) * limit;

  const [rawProducts, total] = await Promise.all([
    Product.find(query)
      .populate({
        path: "category",
        select: "name isListed",
        match: { isListed: true, isDeleted: false },
      })
      .populate({
        path: "subcategory",
        select: "name isListed",
        match: { isListed: true, isDeleted: false },
      })
      .populate("seller", "name email")
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  const products = rawProducts.filter((p) => p.category !== null);

  return {
    products,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

export const getListedProductById = async (id) => {
  const product = await Product.findOne({
    _id: id,
    isDeleted: false,
    isListed: true,
  })
    .populate({
      path: "category",
      select: "name isListed",
      match: { isListed: true, isDeleted: false },
    })
    .populate({
      path: "subcategory",
      select: "name isListed",
      match: { isListed: true, isDeleted: false },
    })
    .populate("seller", "name email");

  if (product && !product.category) return null;

  if (product) {
    await Product.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  return product;
};

export const getRelatedProducts = async (categoryId, excludeId, limit = 4) => {
  const products = await Product.find({
    category: categoryId,
    _id: { $ne: excludeId },
    isDeleted: false,
    isListed: true,
  })
    .limit(limit)
    .populate({
      path: "category",
      select: "name isListed",
      match: { isListed: true, isDeleted: false },
    })
    .populate("seller", "name")
    .sort({ createdAt: -1 });

  return products.filter((p) => p.category !== null);
};

export const getAllBrands = async () => {
  return await Product.distinct("brand", {
    isDeleted: false,
    brand: { $exists: true, $ne: "" },
  });
};
