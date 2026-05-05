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
      error: req.query.error || null,
    });
  } catch (error) {
    return res.redirect("/shop?error=" + encodeURIComponent("An error occurred while loading products. Please try again later."));
  }
};

export const getProductDetail = async (req, res) => {
  try {
    const product = await productService.getListedProductById(req.params.id);

    if (!product) {
      const Product = (await import("../../shared/models/Product.js")).default;
      const deletedProduct = await Product.findById(req.params.id).select(
        "isDeleted isListed title",
      );

      if (deletedProduct) {
        if (deletedProduct.isDeleted) {
          return res.redirect("/shop?error=" + encodeURIComponent("This product has been removed from our catalog."));
        } else if (!deletedProduct.isListed) {
          return res.redirect("/shop?error=" + encodeURIComponent("This product is currently unavailable."));
        }
      }

      return res.redirect("/shop?error=" + encodeURIComponent("Product not found."));
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
      userId: req.session.userId || null,
    });
  } catch (error) {
    return res.redirect("/shop?error=" + encodeURIComponent("An error occurred while loading the product. Please try again later."));
  }
};
