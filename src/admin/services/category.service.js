import MESSAGES from "../../shared/constants/messages.js";
import Category from "../../shared/models/Category.js";
export const getAllCategories = async ({
  search = "",
  page = 1,
  limit = 10,
  isSubcategory = "",
  status = "",
  sort = "",
}) => {
  const query = {
    isDeleted: false,
    ...(search && { name: { $regex: search, $options: "i" } }),
    ...(isSubcategory !== "" && { isSubcategory: isSubcategory === "true" }),
    ...(status === "listed" && { isListed: true }),
    ...(status === "unlisted" && { isListed: false }),
  };
  const sortOptions = {
    "name-asc": { name: 1 },
    "name-desc": { name: -1 },
    "date-desc": { createdAt: -1 },
    "date-asc": { createdAt: 1 },
  };
  const skip = (page - 1) * limit;
  const [categories, total] = await Promise.all([
    Category.find(query)
      .populate("parentCategory", "name")
      .populate("subcategories", "name")
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
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
  return await Category.findOne({ _id: id, isDeleted: false })
    .populate("parentCategory", "name")
    .populate("subcategories", "name");
};
export const categoryNameExists = async (name, parentId = null, excludeId = null) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {
    name: { $regex: `^${escapedName}$`, $options: "i" },
    isDeleted: false,
  };
  if (parentId) {
    query.parentCategory = parentId;
  } else {
    query.parentCategory = null;
  }
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return await Category.findOne(query);
};
export const createCategory = async ({ name, description, parentCategory = null, isSubcategory = false }) => {
  const existingCategory = await categoryNameExists(name, parentCategory);
  if (existingCategory) {
    if (parentCategory) {
      throw new Error(`Subcategory "${name}" already exists under this parent category`);
    } else {
      throw new Error(`Category "${name}" already exists`);
    }
  }
  const category = new Category({
    name,
    description,
    parentCategory,
    isSubcategory,
  });
  const savedCategory = await category.save();
  if (parentCategory) {
    await Category.findByIdAndUpdate(parentCategory, {
      $addToSet: { subcategories: savedCategory._id },
    });
  }
  return savedCategory;
};
export const updateCategory = async (id, { name, description, isListed, parentCategory }) => {
  const category = await Category.findById(id);
  if (!category) return null;
  if (name !== undefined && name !== category.name) {
    const existingCategory = await categoryNameExists(name, parentCategory || category.parentCategory, id);
    if (existingCategory) {
      if (parentCategory || category.parentCategory) {
        throw new Error(`Subcategory "${name}" already exists under this parent category`);
      } else {
        throw new Error(`Category "${name}" already exists`);
      }
    }
  }
  if (parentCategory !== undefined && category.parentCategory?.toString() !== parentCategory) {
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(category.parentCategory, {
        $pull: { subcategories: id },
      });
    }
    if (parentCategory) {
      await Category.findByIdAndUpdate(parentCategory, {
        $addToSet: { subcategories: id },
      });
      category.isSubcategory = true;
    } else {
      category.isSubcategory = false;
    }
    category.parentCategory = parentCategory;
  }
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (isListed !== undefined) category.isListed = isListed;
  return await category.save();
};
export const softDeleteCategory = async (id) => {
  const category = await Category.findById(id);
  if (!category) return null;
  await Category.updateMany({ parentCategory: id }, { isDeleted: true });
  if (category.parentCategory) {
    await Category.findByIdAndUpdate(category.parentCategory, {
      $pull: { subcategories: id },
    });
  }
  return await Category.findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: "after" });
};
export const toggleCategoryListed = async (id) => {
  const category = await Category.findById(id);
  if (!category) return null;
  const newListedStatus = !category.isListed;
  category.isListed = newListedStatus;
  if (!newListedStatus && category.subcategories && category.subcategories.length > 0) {
    await Category.updateMany({ parentCategory: id }, { isListed: false });
  }
  if (newListedStatus && category.isSubcategory && category.parentCategory) {
    const parent = await Category.findById(category.parentCategory);
    if (parent && !parent.isListed) {
      throw new Error(MESSAGES.CUSTOM.CANNOT_UNBLOCK_SUBCATEGORY_WHEN_PARENT_CATEGORY_IS_BLOCKED_PLEASE_UNBLOCK_THE_PARENT_CATEGORY_FIRST);
    }
  }
  return await category.save();
};
export const getMainCategories = async () => {
  return await Category.find({ isSubcategory: false, isDeleted: false, isListed: true })
    .populate({
      path: "subcategories",
      match: { isDeleted: false, isListed: true },
      select: "name",
    })
    .sort({ sortOrder: 1, name: 1 });
};
export const getSubcategories = async (parentId) => {
  return await Category.find({
    parentCategory: parentId,
    isSubcategory: true,
    isDeleted: false,
    isListed: true,
  }).sort({ sortOrder: 1, name: 1 });
};
export const getCategoryHierarchy = async () => {
  const categories = await Category.find({ isDeleted: false })
    .populate("subcategories", "name isListed")
    .sort({ isSubcategory: 1, sortOrder: 1, name: 1 });
  const mainCategories = categories.filter((cat) => !cat.isSubcategory);
  return mainCategories.map((mainCat) => ({
    ...mainCat.toObject(),
    children: categories.filter(
      (c) => c.parentCategory?.toString() === mainCat._id.toString()
    ),
  }));
};