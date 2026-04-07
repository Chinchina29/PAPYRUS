import * as sellerService from "../../services/sellerSubmission.service.js";
import * as categoryService from "../../services/category.service.js";
import { v2 as cloudinary } from "cloudinary";

export const getSellPage = async (req, res) => {
  try {
    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });

    res.render("user/sell", {
      categories,
      user: req.session.userId,
    });
  } catch (error) {
    console.error("getSellPage error:", error.message);
    res.status(500).render("error/500", { error });
  }
};

export const submitBook = async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      price,
      category,
      condition,
      isbn,
      publisher,
      images,
    } = req.body;

    if (!title?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Book title is required" });
    }
    if (!price || isNaN(price) || price < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid price is required" });
    }
    if (!category) {
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    }
    if (!images || images.length < 3) {
      return res
        .status(400)
        .json({ success: false, message: "Minimum 3 images are required" });
    }

    const uploadedImages = [];
    for (const base64Image of images) {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: "papyrus/seller-submissions",
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

    await sellerService.createSubmission({
      title: title.trim(),
      author: author?.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      category,
      condition,
      isbn: isbn?.trim(),
      publisher: publisher?.trim(),
      images: uploadedImages,
      submittedBy: req.session.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Book submitted successfully! We will review it shortly.",
      redirectUrl: "/sell/my-listings",
    });
  } catch (error) {
    console.error("submitBook error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const submissions = await sellerService.getSubmissionsByUser(
      req.session.userId,
    );
    res.render("user/my-listings", {
      submissions,
      user: req.session.userId,
    });
  } catch (error) {
    console.error("getMyListings error:", error.message);
    res.status(500).render("error/500", { error });
  }
};
