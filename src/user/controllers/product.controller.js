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
      });

    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });

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
    res.status(500).render("error/500");
  }
};

export const getProductDetail = async (req, res) => {
  try {
    const product = await productService.getListedProductById(req.params.id);

    if (!product) {
      return res.redirect("/shop?error=product_unavailable");
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
    res.redirect("/shop?error=product_not_found");
  }
};
