import Product from "../models/Product.js";

export const getAllProducts = async ({ search = "", page = 1, limit = 10, showDeleted = false }) => {
  const query = {
    ...(showDeleted ? {} : { isDeleted: false }),
    ...(search && {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ],
    }),
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
      .populate("seller", "firstName lastName email")
      .sort({ createdAt: -1 })
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
  const query = {
    title: { $regex: `^${title}$`, $options: "i" },
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
  return await Product.findByIdAndUpdate(id, data, { returnDocument: 'after' });
};

export const softDeleteProduct = async (id) => {
  return await Product.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { returnDocument: 'after' },
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
}) => {
  const query = {
    isDeleted: false,
    isListed: true,
    ...(search && {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    }),
    ...(category && { category }),
    ...(condition && { condition }),
    ...(brand && { brand: { $regex: brand, $options: "i" } }),
    ...(minPrice || maxPrice
      ? {
          price: {
            ...(minPrice && { $gte: parseFloat(minPrice) }),
            ...(maxPrice && { $lte: parseFloat(maxPrice) }),
          },
        }
      : {}),
  };

  const sortOptions = {
    newest: { createdAt: -1 },
    "price-low": { price: 1 },
    "price-high": { price: -1 },
    "a-z": { title: 1 },
    "z-a": { title: -1 },
    popular: { views: -1 },
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("seller", "name email")
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

export const getListedProductById = async (id) => {
  const product = await Product.findOne({
    _id: id,
    isDeleted: false,
    isListed: true,
  })
    .populate("category", "name")
    .populate("subcategory", "name")
    .populate("seller", "name email");

  if (product) {
    await Product.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  return product;
};

export const getRelatedProducts = async (categoryId, excludeId, limit = 4) => {
  return await Product.find({
    category: categoryId,
    _id: { $ne: excludeId },
    isDeleted: false,
    isListed: true,
  })
    .limit(limit)
    .populate("category", "name")
    .populate("seller", "name")
    .sort({ createdAt: -1 });
};


export const getAllBrands = async () => {
  return await Product.distinct("brand", { isDeleted: false, brand: { $ne: null, $ne: "" } });
};
