import Category from "../../shared/models/Category.js";

export const getAllCategories = async ({
  search = "",
  page = 1,
  limit = 10,
  isSubcategory = "",
}) => {
  const query = {
    isDeleted: false,
    ...(search && { name: { $regex: search, $options: "i" } }),
    ...(isSubcategory !== "" && { isSubcategory: isSubcategory === "true" }),
  };

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(query)
      .populate('parentCategory', 'name')
      .populate('subcategories', 'name')
      .sort({ createdAt: -1 })
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
    .populate('parentCategory', 'name')
    .populate('subcategories', 'name');
};

export const categoryNameExists = async (name, parentId = null, excludeId = null) => {
  return null;
};

export const createCategory = async ({ name, description, parentCategory = null, isSubcategory = false }) => {
  const category = new Category({ 
    name, 
    description, 
    parentCategory,
    isSubcategory
  });
  
  const savedCategory = await category.save();
  
  if (parentCategory) {
    await Category.findByIdAndUpdate(
      parentCategory,
      { $addToSet: { subcategories: savedCategory._id } }
    );
  }
  
  return savedCategory;
};

export const updateCategory = async (id, { name, description, isListed, parentCategory }) => {
  const category = await Category.findById(id);
  if (!category) return null;

  if (parentCategory !== undefined && category.parentCategory?.toString() !== parentCategory) {
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(
        category.parentCategory,
        { $pull: { subcategories: id } }
      );
    }
    
    if (parentCategory) {
      await Category.findByIdAndUpdate(
        parentCategory,
        { $addToSet: { subcategories: id } }
      );
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

  await Category.updateMany(
    { parentCategory: id },
    { isDeleted: true }
  );

  if (category.parentCategory) {
    await Category.findByIdAndUpdate(
      category.parentCategory,
      { $pull: { subcategories: id } }
    );
  }

  return await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { returnDocument: 'after' }
  );
};

export const toggleCategoryListed = async (id) => {
  const category = await Category.findById(id);
  if (!category) return null;
  
  category.isListed = !category.isListed;
  
  if (!category.isListed && category.subcategories && category.subcategories.length > 0) {
    await Category.updateMany(
      { parentCategory: id },
      { isListed: false }
    );
  }
  
  return await category.save();
};

export const getMainCategories = async () => {
  return await Category.find({ isSubcategory: false, isDeleted: false, isListed: true })
    .sort({ sortOrder: 1, name: 1 });
};

export const getSubcategories = async (parentId) => {
  return await Category.find({ parentCategory: parentId, isSubcategory: true, isDeleted: false, isListed: true })
    .sort({ sortOrder: 1, name: 1 });
};

export const getCategoryHierarchy = async () => {
  const categories = await Category.find({ isDeleted: false })
    .populate('subcategories', 'name isListed')
    .sort({ isSubcategory: 1, sortOrder: 1, name: 1 });

  const mainCategories = categories.filter(cat => !cat.isSubcategory);
  
  return mainCategories.map(mainCat => ({
    ...mainCat.toObject(),
    children: categories.filter(c => c.parentCategory?.toString() === mainCat._id.toString())
  }));
};