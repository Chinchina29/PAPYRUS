import * as productService from "../../shared/services/product.service.js";
import * as categoryService from "../../admin/services/category.service.js";
import Product from "../../shared/models/Product.js";
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
    return res.redirect(
      "/shop?error=" +
        encodeURIComponent(
          "An error occurred while loading products. Please try again later.",
        ),
    );
  }
};
export const getProductDetail = async (req, res) => {
  try {
    const fromMyListings = req.query.from === "my-listings";
    let product;
    if (fromMyListings) {
      product = await Product.findOne({
        _id: req.params.id,
        isDeleted: false,
        isListed: true,
      })
        .populate("category", "name isListed")
        .populate("subcategory", "name isListed")
        .populate("seller", "name email");
      if (product) {
        await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
      }
    } else {
      product = await productService.getListedProductById(req.params.id);
    }
    if (!product) {
      const rawProduct = await Product.findById(req.params.id)
        .select("isDeleted isListed title author images category")
        .populate("category", "name isListed isDeleted");
      if (rawProduct) {
        if (rawProduct.isDeleted) {
          return res.render("user/product-unavailable", {
            reason: "removed",
            title: rawProduct.title,
            user: req.session.user || null,
            currentPage_name: "shop",
          });
        }
        if (!rawProduct.isListed) {
          return res.render("user/product-unavailable", {
            reason: "unlisted",
            title: rawProduct.title,
            user: req.session.user || null,
            currentPage_name: "shop",
          });
        }
        if (
          rawProduct.category &&
          (!rawProduct.category.isListed || rawProduct.category.isDeleted)
        ) {
          return res.render("user/product-unavailable", {
            reason: "category",
            title: rawProduct.title,
            user: req.session.user || null,
            currentPage_name: "shop",
          });
        }
      }
      return res.render("user/product-unavailable", {
        reason: "notfound",
        title: null,
        user: req.session.user || null,
        currentPage_name: "shop",
      });
    }
    const related = await productService.getRelatedProducts(
      product.category?._id,
      product._id,
    );
    res.render("user/product-detail", {
      product,
      related,
      currentPage_name: "shop",
      user: req.session.user || null,
      userId: req.session.userId || null,
      from: req.query.from || null,
    });
  } catch (error) {
    return res.redirect(
      "/shop?error=" +
        encodeURIComponent(
          "An error occurred while loading the product. Please try again later.",
        ),
    );
  }
};
