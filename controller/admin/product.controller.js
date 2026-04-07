import * as productService from "../../services/product.service.js";
import * as categoryService from "../../services/category.service.js";
import { v2 as cloudinary } from "cloudinary";
export const getProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { products, total, totalPages, currentPage } =
      await productService.getAllProducts({ search, page, limit });

    res.render("admin/product/list", {
      products,
      total,
      totalPages,
      currentPage,
      search,
      currentPage_name: "products",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getProducts error:", error.message);
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
      currentPage_name: "products",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getAddProduct error:", error.message);
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
      description,
      price,
      originalPrice,
      category,
      stock,
      author,
      isbn,
      publisher,
      images,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
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

    if (!images || images.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Minimum 3 images are required",
      });
    }

    const exists = await productService.productNameExists(name.trim());
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Product name already exists",
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
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      category,
      stock: parseInt(stock) || 0,
      author: author?.trim(),
      isbn: isbn?.trim(),
      publisher: publisher?.trim(),
      images: uploadedImages,
    });

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
      redirectUrl: "/admin/products",
    });
  } catch (error) {
    console.error("addProduct error:", error.message);
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
      currentPage_name: "products",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getEditProduct error:", error.message);
    res.redirect("/admin/products");
  }
};

export const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      originalPrice,
      category,
      stock,
      author,
      isbn,
      publisher,
      newImages,
      removedImages,
      isListed,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!price || isNaN(price)) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    const exists = await productService.productNameExists(name.trim(), id);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Product name already exists",
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
        await cloudinary.uploader.destroy(publicId);
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
        message: "Minimum 3 images are required",
      });
    }

    await productService.updateProduct(id, {
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      category,
      stock: parseInt(stock) || 0,
      author: author?.trim(),
      isbn: isbn?.trim(),
      publisher: publisher?.trim(),
      images: product.images,
      isListed: isListed === true || isListed === "true",
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      redirectUrl: "/admin/products",
    });
  } catch (error) {
    console.error("editProduct error:", error.message);
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

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("deleteProduct error:", error.message);
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
    console.error("toggleProduct error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
