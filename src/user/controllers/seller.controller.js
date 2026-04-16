import * as sellerService from "../../admin/services/sellarSubmission.services.js";
import * as categoryService from "../../admin/services/category.service.js";
import { v2 as cloudinary } from "cloudinary";

export const getSellPage = async (req, res) => {
  try {
    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });
    const submissions = await sellerService.getSubmissionsByUser(
      req.session.userId,
    );
    const recentSubmissions = submissions.slice(0, 3);
    const stats = {
      totalRevenue: 0,
      itemsSold: 0,
      pendingCount: submissions.filter((s) => s.status === "pending").length,
      recentSales: 0,
    };
    res.render("user/sellar", {
      categories,
      recentSubmissions,
      stats,
      recentOrders: [],
    });
  } catch (error) {
    res.status(500).render("error/500", { error });
  }
};

export const getCreatePage = async (req, res) => {
  try {
    const { categories } = await categoryService.getAllCategories({
      page: 1,
      limit: 100,
    });
    res.render("user/sell-create", { categories });
  } catch (error) {
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
      videos,
    } = req.body;

    if (!title?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Book title is required" });
    if (!price || isNaN(price) || price < 0)
      return res
        .status(400)
        .json({ success: false, message: "Valid price is required" });
    if (!category)
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    if (!images || !Array.isArray(images) || images.length < 3)
      return res
        .status(400)
        .json({ success: false, message: "Minimum 3 images are required" });

    const uploadedImages = [];

    if (!Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images must be an array",
      });
    }

    for (let i = 0; i < images.length; i++) {
      const base64Image = images[i];

      if (typeof base64Image !== "string") {
        return res.status(400).json({
          success: false,
          message: `Invalid image data format at index ${i}. Expected string, got ${typeof base64Image}`,
        });
      }

      if (!base64Image.startsWith("data:image/")) {
        return res.status(400).json({
          success: false,
          message: `Invalid image format at index ${i}. Must be a valid base64 data URL`,
        });
      }

      try {
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
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Failed to upload image ${i}: ${uploadError.message}`,
        });
      }
    }

    const uploadedVideos = [];
    if (videos && Array.isArray(videos) && videos.length > 0) {
      for (let i = 0; i < videos.length; i++) {
        const videoData = videos[i];

        if (
          typeof videoData === "object" &&
          videoData.url &&
          videoData.publicId
        ) {
          uploadedVideos.push(videoData);
        } else if (
          typeof videoData === "string" &&
          videoData.startsWith("data:video/")
        ) {
          try {
            const result = await cloudinary.uploader.upload(videoData, {
              folder: "papyrus/seller-videos",
              resource_type: "video",
              transformation: [
                { width: 1280, height: 720, crop: "limit" },
                { quality: "auto" },
              ],
            });

            uploadedVideos.push({
              url: result.secure_url,
              publicId: result.public_id,
              duration: result.duration,
              size: result.bytes,
            });
          } catch (uploadError) {
            return res.status(400).json({
              success: false,
              message: `Failed to upload video ${i}: ${uploadError.message}`,
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: `Invalid video data format at index ${i}`,
          });
        }
      }
    }

    const submissionData = {
      title: title.trim(),
      author: author?.trim() || "",
      description: description?.trim() || "",
      price: parseFloat(price),
      category,
      condition,
      isbn: isbn?.trim() || "",
      publisher: publisher?.trim() || "",
      images: uploadedImages,
      videos: uploadedVideos,
      submittedBy: req.session.userId,
    };

    if (!submissionData.submittedBy) {
      return res.status(401).json({
        success: false,
        message: "User session expired. Please log in again.",
      });
    }

    await sellerService.createSubmission(submissionData);

    return res.status(200).json({
      success: true,
      message: "Book submitted successfully! We will review it shortly.",
      redirectUrl: "/sell/my-listings",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video file provided",
      });
    }

    const videoData = {
      url: req.file.path,
      publicId: req.file.filename,
      duration: req.file.duration || 0,
      size: req.file.size || 0,
    };

    return res.json({
      success: true,
      message: "Video uploaded successfully",
      video: videoData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload video: " + error.message,
    });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const submissions = await sellerService.getSubmissionsByUser(
      req.session.userId,
    );

    const populatedSubmissions = await Promise.all(
      submissions.map(async (sub) => {
        const subObj = sub.toObject();
        if (subObj.approvedProductId) {
          try {
            const Product = (await import("../../shared/models/Product.js"))
              .default;
            const product = await Product.findById(subObj.approvedProductId)
              .select("isDeleted isListed")
              .lean();

            subObj.productExists = !!product;
            subObj.productDeleted = product?.isDeleted || false;
            subObj.productListed = product?.isListed || false;
          } catch (err) {
            subObj.productExists = false;
            subObj.productDeleted = false;
            subObj.productListed = false;
          }
        }
        return subObj;
      }),
    );

    res.render("user/my-listings", { submissions: populatedSubmissions });
  } catch (error) {
    res.status(500).render("error/500", { error });
  }
};
