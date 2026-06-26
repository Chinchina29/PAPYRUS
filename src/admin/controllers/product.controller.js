import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as productService from "../../shared/services/product.service.js";
import * as categoryService from "../services/category.service.js";
import { v2 as cloudinary } from "cloudinary";
export const getProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const showDeleted = req.query.showDeleted === "true";
    const sort = req.query.sort || "";
    const category = req.query.category || "";
    const minPrice = req.query.minPrice || "";
    const maxPrice = req.query.maxPrice || "";
    const condition = req.query.condition || "";
    const status = req.query.status || "";
    const stock = req.query.stock || "";
    const limit = 5;
    const { products, total, totalPages, currentPage } =
      await productService.getAllProducts({
        search,
        page,
        limit,
        showDeleted,
        sort,
        category,
        minPrice,
        maxPrice,
        condition,
        status,
        stock,
      });
    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });
    res.render("admin/product/list", {
      products,
      total,
      totalPages,
      currentPage,
      search,
      showDeleted,
      sort,
      category,
      minPrice,
      maxPrice,
      condition,
      status,
      stock,
      categories,
      currentPage_name: "inventory",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: MESSAGES.COMMON.INTERNAL_ERROR,
      message: error.message,
    });
  }
};
export const getAddProduct = async (req, res) => {
  try {
    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });
    res.render("admin/product/add", {
      categories,
      currentPage_name: "inventory",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: MESSAGES.COMMON.INTERNAL_ERROR,
      message: error.message,
    });
  }
};
export const addProduct = async (req, res) => {
  try {
    const {
      name,
      title,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      condition,
      stock,
      author,
      isbn,
      publisher,
      brand,
      publishedYear,
      language,
      pages,
      maxQuantityPerOrder,
      images,
    } = req.body;
    const productTitle = name || title;
    if (!productTitle?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PRODUCT_TITLE_IS_REQUIRED,
      });
    }
    if (!price || isNaN(price) || price < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.VALID_PRICE_IS_REQUIRED,
      });
    }
    if (!category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.CATEGORY_IS_REQUIRED,
      });
    }
    const productCondition = condition || "good";
    if (!images || images.length < 3) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.AT_LEAST_3_IMAGES_ARE_REQUIRED,
      });
    }
    const adminUser = req.session.adminUser;
    if (!adminUser) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.CUSTOM.ADMIN_AUTHENTICATION_REQUIRED,
      });
    }
    const uploadedImages = [];
    for (const base64Image of images) {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: "papyrus/products",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto" },
        ],
      });
      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }
    await productService.createProduct({
      title: productTitle.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      category,
      subcategory: subcategory || null,
      condition: productCondition,
      stock:
        stock !== undefined && stock !== null && stock !== ""
          ? parseInt(stock)
          : 0,
      author: author?.trim(),
      isbn: isbn?.trim(),
      publisher: publisher?.trim(),
      brand: brand?.trim(),
      publishedYear: publishedYear ? parseInt(publishedYear) : null,
      language: language?.trim() || "English",
      pages: pages ? parseInt(pages) : null,
      maxQuantityPerOrder: maxQuantityPerOrder
        ? parseInt(maxQuantityPerOrder)
        : 10,
      images: uploadedImages,
      seller: adminUser.id,
    });
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CUSTOM.PRODUCT_ADDED_SUCCESSFULLY,
      redirectUrl: "/admin/products",
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
export const getEditProduct = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) return res.redirect("/admin/products");
    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });
    res.render("admin/product/edit", {
      product,
      categories,
      currentPage_name: "inventory",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.redirect("/admin/products");
  }
};
export const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      title,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      condition,
      stock,
      author,
      isbn,
      publisher,
      brand,
      publishedYear,
      language,
      pages,
      maxQuantityPerOrder,
      newImages,
      removedImages,
      isListed,
    } = req.body;
    const productTitle = name || title;
    if (!productTitle?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.PRODUCT_TITLE_IS_REQUIRED,
      });
    }
    if (!price || isNaN(price)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.VALID_PRICE_IS_REQUIRED,
      });
    }
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.PRODUCT.NOT_FOUND,
      });
    }
    if (removedImages && removedImages.length > 0) {
      for (const publicId of removedImages) {
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      product.images = product.images.filter(
        (img) => !removedImages.includes(img.publicId),
      );
    }
    if (newImages && newImages.length > 0) {
      for (const base64Image of newImages) {
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: "papyrus/products",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" },
          ],
        });
        product.images.push({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    }
    if (product.images.length < 3) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CUSTOM.AT_LEAST_3_IMAGES_ARE_REQUIRED,
      });
    }
    await productService.updateProduct(id, {
      title: productTitle.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      category,
      subcategory: subcategory || null,
      condition,
      stock:
        stock !== undefined && stock !== null && stock !== ""
          ? parseInt(stock)
          : 0,
      author: author?.trim(),
      isbn: isbn?.trim(),
      publisher: publisher?.trim(),
      brand: brand?.trim(),
      publishedYear: publishedYear ? parseInt(publishedYear) : null,
      language: language?.trim() || "English",
      pages: pages ? parseInt(pages) : null,
      maxQuantityPerOrder: maxQuantityPerOrder
        ? parseInt(maxQuantityPerOrder)
        : 10,
      images: product.images,
      isListed: isListed === true || isListed === "true",
    });
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.PRODUCT.UPDATED,
      redirectUrl: "/admin/products",
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.PRODUCT.NOT_FOUND,
      });
    }
    await productService.softDeleteProduct(id);
    const SellerSubmission = (
      await import("../../shared/models/SellerSubmission.js")
    ).default;
    const submission = await SellerSubmission.findOne({
      approvedProductId: id,
    });
    if (submission) {
      submission.status = "rejected";
      submission.adminNote = "Product was deleted by admin";
      await submission.save();
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.PRODUCT.DELETED,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
export const toggleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.toggleProductListed(id);
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.PRODUCT.NOT_FOUND,
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Product ${product.isListed ? "listed" : "unlisted"} successfully`,
      isListed: product.isListed,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};