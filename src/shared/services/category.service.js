import Category from "../models/Category.js";
export const getMainCategoriesWithSubs = async () => {
  return await Category.find({
    isSubcategory: false,
    isDeleted: false,
    isListed: true,
  })
    .populate({
      path: "subcategories",
      match: {
        isDeleted: false,
        isListed: true,
      },
    })
    .sort({ sortOrder: 1, name: 1 });
};
