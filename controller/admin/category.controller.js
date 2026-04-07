import * as categoryService from "../../services/category.service.js";
export const getCategories = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { categories, total, totalPages, currentPage } =
      await categoryService.getAllCategories({ search, page, limit });

    res.render("admin/category/list", {
      categories,
      total,
      totalPages,
      currentPage,
      search,
      currentPage_name: "categories",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getCategories error:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

export const getAddCategory = (req, res) => {
  try {
    res.render("admin/category/add", {
      currentPage_name: "categories",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getAddCategory error:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }
    const exists = await categoryService.categoryNameExists(name.trim());
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }

    await categoryService.createCategory({
      name: name.trim(),
      description: description?.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Category added successfully",
      redirectUrl: "/admin/categories",
    });
  } catch (error) {
    console.error("addCategory error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getEditCategory = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    if (!category) return res.redirect("/admin/categories");

    res.render("admin/category/edit", {
      category,
      currentPage_name: "categories",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getEditCategory error:", error.message);
    res.redirect("/admin/categories");
  }
};

export const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isListed } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const exists = await categoryService.categoryNameExists(name.trim(), id);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }
    await categoryService.updateCategory(id, {
      name: name.trim(),
      description: description?.trim(),
      isListed: isListed === true || isListed === "true",
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      redirectUrl: "/admin/categories",
    });
  } catch (error) {
    console.error("editCategory error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await categoryService.getCategoryById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await categoryService.softDeleteCategory(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("deleteCategory error:", error.message);
    return res.status(500).json({
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
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Category ${category.isListed ? "listed" : "unlisted"} successfully`,
      isListed: category.isListed,
    });
  } catch (error) {
    console.error("toggleCategory error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
