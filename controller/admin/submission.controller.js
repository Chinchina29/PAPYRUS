import * as sellerService from "../../services/sellerSubmission.service.js";
import * as productService from "../../services/product.service.js";

export const getSubmissions = async (req, res) => {
  try {
    const status = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { submissions, total, totalPages, currentPage } =
      await sellerService.getAllSubmissions({ status, page, limit });

    res.render("admin/submissions/list", {
      submissions,
      total,
      totalPages,
      currentPage,
      status,
      currentPage_name: "submissions",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getSubmissions error:", error.message);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
};

export const getSubmissionDetail = async (req, res) => {
  try {
    const submission = await sellerService.getSubmissionById(req.params.id);
    if (!submission) return res.redirect("/admin/submissions");

    res.render("admin/submissions/detail", {
      submission,
      currentPage_name: "submissions",
      user: req.session.adminUser,
    });
  } catch (error) {
    console.error("getSubmissionDetail error:", error.message);
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

    const submission = await sellerService.getSubmissionById(id);
    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    }

    if (action === "approved") {
      const product = await productService.createProduct({
        name: submission.title,
        description: submission.description,
        price: submission.price,
        category: submission.category._id,
        stock: 1,
        author: submission.author,
        isbn: submission.isbn,
        publisher: submission.publisher,
        images: submission.images,
        isListed: true,
      });

      await sellerService.linkApprovedProduct(id, product._id);
    } else {
      await sellerService.updateSubmissionStatus(
        id,
        "rejected",
        adminNote || "",
      );
    }

    return res.status(200).json({
      success: true,
      message: `Submission ${action} successfully`,
    });
  } catch (error) {
    console.error("reviewSubmission error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
