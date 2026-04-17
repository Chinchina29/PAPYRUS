import SellerSubmission from "../../shared/models/SellerSubmission.js";
import * as productService from "../../shared/services/product.service.js";
import * as categoryService from "../services/category.service.js";
import { v2 as cloudinary } from "cloudinary";

export const getSubmissions = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "all";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const filter = {};
    if (status !== "all") filter.status = status;
    if (search) {
      filter.$or = [{ title: { $regex: search, $options: "i" } }];
    }

    const total = await SellerSubmission.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    const submissions = await SellerSubmission.find(filter)
      .populate("submittedBy", "firstName lastName email")
      .populate("category", "name")
      .populate("approvedProductId", "isDeleted")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const activeSubmissions = submissions.filter((sub) => {
      if (sub.status !== "approved") return true;

      if (!sub.approvedProductId) return false;
      if (sub.approvedProductId.isDeleted) return false;

      return true;
    });

    const filteredTotal = activeSubmissions.length;

    res.render("admin/submissions/list", {
      submissions: activeSubmissions,
      search,
      status,
      currentPage: page,
      totalPages: Math.ceil(filteredTotal / limit) || 1,
      currentPage_name: "submissions",
      user: req.session.adminUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
};

export const getSubmissionDetail = async (req, res) => {
  try {
    const submission = await SellerSubmission.findById(req.params.id)
      .populate("submittedBy", "firstName lastName email")
      .populate("category", "name");

    if (!submission) return res.redirect("/admin/submissions");

    res.render("admin/submissions/detail", {
      submission,
      currentPage_name: "submissions",
      user: req.session.adminUser,
    });
  } catch (error) {
    res.redirect("/admin/submissions");
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNote } = req.body;

    if (!["approved", "rejected"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    const submission = await SellerSubmission.findById(id)
      .populate("category", "name")
      .populate("submittedBy", "firstName lastName email");

    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    }

    submission.status = action;
    submission.reviewedBy = req.session.adminUser.id;
    submission.reviewedAt = new Date();
    if (adminNote) {
      if (action === "rejected") {
        submission.rejectionReason = adminNote;
      } else {
        submission.reviewNotes = adminNote;
      }
    }

    if (action === "approved") {
      const product = await productService.createProduct({
        title: submission.title,
        author: submission.author || "Unknown Author",
        description: submission.description || "No description provided",
        price: submission.price,
        category: submission.category._id,
        condition: submission.condition,
        stock: 1,
        isbn: submission.isbn,
        publisher: submission.publisher,
        images: submission.images,
        seller: submission.submittedBy._id,
        isListed: true,
        hideFromSeller: true,
      });
      submission.approvedProductId = product._id;
    }

    await submission.save();

    return res.status(200).json({
      success: true,
      message:
        action === "approved"
          ? "Submission approved and added to inventory!"
          : "Submission rejected.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while processing the submission: " + error.message,
    });
  }
};
