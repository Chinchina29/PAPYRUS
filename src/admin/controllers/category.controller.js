import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as categoryService from "../services/category.service.js";
export const getCategories = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const isSubcategory = req.query.isSubcategory || "";
    const status = req.query.status || "";
    const sort = req.query.sort || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const { categories, total, totalPages, currentPage } =
      await categoryService.getAllCategories({
        search,
        page,
        limit,
        isSubcategory,
        status,
        sort,
      });
    const hierarchy = await categoryService.getCategoryHierarchy();
    res.render("admin/category/list", {
      categories,
      total,
      totalPages,
      currentPage,
      search,
      isSubcategory,
      status,
      sort,
      hierarchy,
      currentPage_name: "categories",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: MESSAGES.COMMON.INTERNAL_ERROR,
      message: error.message,
    });
  }
};
export const getAddCategory = async (req, res) => {
  try {
    const mainCategories = await categoryService.getMainCategories();
    res.render("admin/category/add", {
      mainCategories,
      currentPage_name: "categories",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: MESSAGES.COMMON.INTERNAL_ERROR,
      message: error.message,
    });
  }
};
export const addCategory = async (req, res) => {
  try {
    const { name, description, parentCategory, subcategories, categoryOffer } = req.body;
    if (!name?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.CATEGORY_NAME_IS_REQUIRED,
      });
    }
    let isSubcategory = false;
    let parentId = null;
    if (parentCategory && parentCategory !== "") {
      const parent = await categoryService.getCategoryById(parentCategory);
      if (!parent) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.INVALID_PARENT_CATEGORY,
        });
      }
      if (parent.isSubcategory) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message:
            MESSAGES.CUSTOM.CANNOT_CREATE_SUBCATEGORY_UNDER_ANOTHER_SUBCATEGORY,
        });
      }
      isSubcategory = true;
      parentId = parentCategory;
    }
    const offer = Math.min(90, Math.max(0, parseFloat(categoryOffer) || 0));
    const category = await categoryService.createCategory({
      name: name.trim(),
      description: description?.trim(),
      parentCategory: parentId,
      isSubcategory,
      categoryOffer: offer,
    });
    if (
      subcategories &&
      Array.isArray(subcategories) &&
      subcategories.length > 0 &&
      !isSubcategory
    ) {
      for (const subName of subcategories) {
        if (subName?.trim()) {
          try {
            await categoryService.createCategory({
              name: subName.trim(),
              parentCategory: category._id,
              isSubcategory: true,
            });
          } catch (subError) {}
        }
      }
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CUSTOM.CATEGORY_ADDED_SUCCESSFULLY,
      redirectUrl: "/admin/categories",
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_ADD_CATEGORY_PLEASE_TRY_AGAIN,
    });
  }
};
export const getEditCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).render("error/404", {
        message: MESSAGES.CATEGORY.NOT_FOUND,
      });
    }
    const allCategories = await categoryService.getAllCategories({
      limit: 1000,
    });
    const availableParents = allCategories.categories.filter(
      (cat) =>
        cat._id.toString() !== id &&
        !cat.isSubcategory &&
        !cat.parentCategory?.equals(id),
    );
    res.render("admin/category/edit", {
      category,
      availableParents,
      currentPage_name: "categories",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: MESSAGES.COMMON.INTERNAL_ERROR,
      message: error.message,
    });
  }
};
export const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isListed, parentCategory, subcategories, categoryOffer } =
      req.body;
    if (!name?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.CATEGORY_NAME_IS_REQUIRED,
      });
    }
    let parentId = null;
    if (parentCategory && parentCategory !== "") {
      const parent = await categoryService.getCategoryById(parentCategory);
      if (!parent) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.INVALID_PARENT_CATEGORY,
        });
      }
      if (parent.isSubcategory) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.CANNOT_MOVE_CATEGORY_UNDER_A_SUBCATEGORY,
        });
      }
      if (parent._id.toString() === id) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.CUSTOM.CATEGORY_CANNOT_BE_ITS_OWN_PARENT,
        });
      }
      parentId = parentCategory;
    }
    const offer = Math.min(90, Math.max(0, parseFloat(categoryOffer) || 0));
    await categoryService.updateCategory(id, {
      name: name.trim(),
      description: description?.trim(),
      isListed: isListed === true || isListed === "true",
      parentCategory: parentId,
      categoryOffer: offer,
    });
    const category = await categoryService.getCategoryById(id);
    if (
      subcategories &&
      Array.isArray(subcategories) &&
      subcategories.length > 0 &&
      !category.isSubcategory
    ) {
      for (const subName of subcategories) {
        if (subName?.trim()) {
          try {
            await categoryService.createCategory({
              name: subName.trim(),
              parentCategory: id,
              isSubcategory: true,
            });
          } catch (subError) {}
        }
      }
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATEGORY.UPDATED,
      redirectUrl: "/admin/categories",
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.CUSTOM.FAILED_TO_UPDATE_CATEGORY_PLEASE_TRY_AGAIN,
    });
  }
};
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CATEGORY.NOT_FOUND,
      });
    }
    if (category.subcategories && category.subcategories.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message:
          MESSAGES.CUSTOM
            .CANNOT_DELETE_CATEGORY_WITH_SUBCATEGORIES_DELETE_SUBCATEGORIES_FIRST,
      });
    }
    await categoryService.softDeleteCategory(id);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATEGORY.DELETED,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
export const toggleCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryService.toggleCategoryListed(id);

    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CATEGORY.NOT_FOUND,
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Category ${category.isListed ? "listed" : "unlisted"} successfully`,
      isListed: category.isListed,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
export const getSubcategories = async (req, res) => {
  try {
    const { parentId } = req.params;
    const subcategories = await categoryService.getSubcategories(parentId);
    return res.json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
