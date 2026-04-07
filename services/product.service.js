import Product from "../Model/product.js";

export const getAllProducts = async ({ search = "", page = 1, limit = 10 }) => {
  const query = {
    isDeleted: false,
    ...(search && {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ],
    }),
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
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
  return await Product.findOne({ _id: id, isDeleted: false }).populate(
    "category",
    "name",
  );
};
export const productNameExists = async (name, excludeId = null) => {
  const query = {
    name: { $regex: `^${name}$`, $options: "i" },
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
  return await Product.findByIdAndUpdate(id, data, { new: true });
};

export const softDeleteProduct = async (id) => {
  return await Product.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
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
}) => {
  const query = {
    isDeleted: false,
    isListed: true,
    ...(search && {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ],
    }),
    ...(category && { category }),
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
    "a-z": { name: 1 },
    "z-a": { name: -1 },
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
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
  return await Product.findOne({
    _id: id,
    isDeleted: false,
    isListed: true,
  }).populate("category", "name");
};

export const getRelatedProducts = async (categoryId, excludeId) => {
  return await Product.find({
    category: categoryId,
    _id: { $ne: excludeId },
    isDeleted: false,
    isListed: true,
  })
    .limit(4)
    .populate("category", "name");
};
