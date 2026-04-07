import Category from "../Model/Category.js";

export const getAllCategories = async ({
  search = "",
  page = 1,
  limit = 10,
}) => {
  const query = {
    isDeleted: false,
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Category.countDocuments(query),
  ]);

  return {
    categories,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

export const getCategoryById = async (id) => {
  return await Category.findOne({ _id: id, isDeleted: false });
};

export const categoryNameExists = async (name, excludeId = null) => {
  const query = {
    name: { $regex: `^${name}$`, $options: "i" },
    isDeleted: false,
  };
  if (excludeId) query._id = { $ne: excludeId };
  return await Category.findOne(query);
};

export const createCategory = async ({ name, description }) => {
  const category = new Category({ name, description });
  return await category.save();
};

export const updateCategory = async (id, { name, description, isListed }) => {
  return await Category.findByIdAndUpdate(
    id,
    { name, description, isListed },
    { new: true },
  );
};

export const softDeleteCategory = async (id) => {
  return await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
};

export const toggleCategoryListed = async (id) => {
  const category = await Category.findById(id);
  if (!category) return null;
  category.isListed = !category.isListed;
  return await category.save();
};
