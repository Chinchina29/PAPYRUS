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
    res.status(500).json({
      error: "Internal server error",
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
    res.status(500).json({
      error: "Internal server error",
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
      return res.status(400).json({
        success: false,
        message: "Product title is required",
      });
    }

    if (!price || isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }
    const productCondition = condition || "good";

    if (!images || images.length < 3) {
      return res.status(400).json({
        success: false,
        message: "At least 3 images are required",
      });
    }

    const adminUser = req.session.adminUser;
    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
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

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
      redirectUrl: "/admin/products",
    });
  } catch (error) {
    return res.status(500).json({
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
      return res.status(400).json({
        success: false,
        message: "Product title is required",
      });
    }

    if (!price || isNaN(price)) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
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
      return res.status(400).json({
        success: false,
        message: "At least 3 images are required",
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

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      redirectUrl: "/admin/products",
    });
  } catch (error) {
    return res.status(500).json({
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
      return res.status(404).json({
        success: false,
        message: "Product not found",
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

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
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
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Product ${product.isListed ? "listed" : "unlisted"} successfully`,
      isListed: product.isListed,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
