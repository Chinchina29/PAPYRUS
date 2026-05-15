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
    res.status(500).json({
      error: "Internal server error",
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
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name, description, parentCategory, subcategories } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    let isSubcategory = false;
    let parentId = null;

    if (parentCategory && parentCategory !== "") {
      const parent = await categoryService.getCategoryById(parentCategory);
      if (!parent) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid parent category" });
      }

      if (parent.isSubcategory) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Cannot create subcategory under another subcategory",
          });
      }

      isSubcategory = true;
      parentId = parentCategory;
    }

    const category = await categoryService.createCategory({
      name: name.trim(),
      description: description?.trim(),
      parentCategory: parentId,
      isSubcategory,
    });

    if (subcategories && Array.isArray(subcategories) && subcategories.length > 0 && !isSubcategory) {
      for (const subName of subcategories) {
        if (subName?.trim()) {
          try {
            await categoryService.createCategory({
              name: subName.trim(),
              parentCategory: category._id,
              isSubcategory: true,
            });
          } catch (subError) {
            // Skip duplicate subcategories but continue with others
            console.log(`Skipping duplicate subcategory: ${subName}`);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Category added successfully",
      redirectUrl: "/admin/categories",
    });
  } catch (error) {
    // Handle duplicate category error
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Failed to add category. Please try again." 
    });
  }
};

export const getEditCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);

    if (!category) {
      return res.status(404).render("error/404", {
        message: "Category not found",
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
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

export const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isListed, parentCategory, subcategories } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    let parentId = null;
    if (parentCategory && parentCategory !== "") {
      const parent = await categoryService.getCategoryById(parentCategory);
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }

      if (parent.isSubcategory) {
        return res.status(400).json({
          success: false,
          message: "Cannot move category under a subcategory",
        });
      }

      if (parent._id.toString() === id) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        });
      }

      parentId = parentCategory;
    }

    await categoryService.updateCategory(id, {
      name: name.trim(),
      description: description?.trim(),
      isListed: isListed === true || isListed === "true",
      parentCategory: parentId,
    });

    const category = await categoryService.getCategoryById(id);
    if (subcategories && Array.isArray(subcategories) && subcategories.length > 0 && !category.isSubcategory) {
      for (const subName of subcategories) {
        if (subName?.trim()) {
          try {
            await categoryService.createCategory({
              name: subName.trim(),
              parentCategory: id,
              isSubcategory: true,
            });
          } catch (subError) {
            // Skip duplicate subcategories but continue with others
            console.log(`Skipping duplicate subcategory: ${subName}`);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      redirectUrl: "/admin/categories",
    });
  } catch (error) {
    // Handle duplicate category error
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to update category. Please try again.",
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

    if (category.subcategories && category.subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with subcategories. Delete subcategories first.",
      });
    }

    await categoryService.softDeleteCategory(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
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
    return res.status(500).json({
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
