import * as productService from "../../services/product.service.js";
import * as categoryService from "../../services/category.service.js";

export const getShop = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const sort = req.query.sort || "newest";
    const category = req.query.category || "";
    const minPrice = req.query.minPrice || "";
    const maxPrice = req.query.maxPrice || "";

    const { products, total, totalPages, currentPage } =
      await productService.getListedProducts({
        search,
        page,
        limit,
        sort,
        category,
        minPrice,
        maxPrice,
      });

    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });

    res.render("user/shop", {
      products,
      total,
      totalPages,
      currentPage,
      search,
      sort,
      category,
      minPrice,
      maxPrice,
      categories,
      currentPage_name: "shop",
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("getShop error:", error.message);
    res.status(500).render("error/500");
  }
};

export const getProductDetail = async (req, res) => {
  try {
    const product = await productService.getListedProductById(req.params.id);

    if (!product) {
      return res.redirect("/shop?blocked=1");
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
    console.error("getProductDetail error:", error.message);
    res.redirect("/shop");
  }
};
