import * as productService from "../../shared/services/product.service.js";
import * as categoryService from "../../admin/services/category.service.js";

export const getShop = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const sort = req.query.sort || "newest";
    const category = req.query.category || "";
    const condition = req.query.condition || "";
    const brand = req.query.brand || "";
    const minPrice = req.query.minPrice || "";
    const maxPrice = req.query.maxPrice || "";

    const { products, total, totalPages, currentPage } =
      await productService.getListedProducts({
        search,
        page,
        limit,
        sort,
        category,
        condition,
        brand,
        minPrice,
        maxPrice,
        userId: req.session.userId || null,
      });

    const categories = await categoryService.getMainCategories();

    const brands = await productService.getAllBrands();

    res.render("user/shop", {
      products,
      total,
      totalPages,
      currentPage,
      search,
      sort,
      category,
      condition,
      brand,
      minPrice,
      maxPrice,
      categories,
      brands,
      currentPage_name: "shop",
      user: req.session.user || null,
    });
  } catch (error) {
    res.status(500).render("error/500", {
      message: "An error occurred while loading products. Please try again later.",
      user: req.session.user || null,
    });
  }
};

export const getProductDetail = async (req, res) => {
  try {
    const product = await productService.getListedProductById(req.params.id);

    if (!product) {
      const Product = (await import("../../shared/models/Product.js")).default;
      const Category = (await import("../../shared/models/Category.js")).default;
      
      const blockedProduct = await Product.findById(req.params.id)
        .select("isDeleted isListed title category")
        .populate("category", "isListed");

      if (blockedProduct) {
        if (blockedProduct.isDeleted) {
          return res.status(404).render("error/404", {
            message: "This product has been permanently removed from our catalog and is no longer available for purchase.",
            user: req.session.user || null,
          });
        }
        
        if (!blockedProduct.isListed) {
          return res.status(404).render("error/404", {
            message: "This product is currently unavailable. It may have been temporarily disabled by the seller or administrator.",
            user: req.session.user || null,
          });
        }
        
        if (blockedProduct.category && !blockedProduct.category.isListed) {
          return res.status(404).render("error/404", {
            message: "This product is currently unavailable because its category has been disabled. Please check back later or browse other categories.",
            user: req.session.user || null,
          });
        }
      }

      return res.status(404).render("error/404", {
        message: "The product you are looking for does not exist or has been removed.",
        user: req.session.user || null,
      });
    }

    const related = await productService.getRelatedProducts(
      product.category._id,
      product._id,
    );

    res.render("user/product-detail", {
      product,
      related,
      currentPage_name: "shop",
      user: req.session.user || null,
    });
  } catch (error) {
    res.status(500).render("error/500", {
      message: "An unexpected error occurred while loading the product. Please try again later.",
      user: req.session.user || null,
    });
  }
};
