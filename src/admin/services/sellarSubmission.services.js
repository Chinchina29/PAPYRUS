import SellerSubmission from "../../shared/models/SellerSubmission.js";

export const createSubmission = async (data) => {
  try {
    const submission = new SellerSubmission(data);
    const result = await submission.save();
    return result;
  } catch (error) {
    throw error;
  }
};

export const getSubmissionsByUser = async (userId) => {
  return await SellerSubmission.find({ submittedBy: userId })
    .populate("category", "name")
    .sort({ createdAt: -1 });
};

export const getAllSubmissions = async ({ status, page = 1, limit = 10 }) => {
  const filter = {};
  if (status) filter.status = status;

  const total = await SellerSubmission.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const submissions = await SellerSubmission.find(filter)
    .populate("submittedBy", "name email")
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return { submissions, total, totalPages, currentPage: page };
};

export const getSubmissionById = async (id) => {
  return await SellerSubmission.findById(id)
    .populate("submittedBy", "name email")
    .populate("category", "name");
};

export const updateSubmissionStatus = async (id, status, adminNote = "") => {
  return await SellerSubmission.findByIdAndUpdate(
    id,
    { status, adminNote },
    { returnDocument: 'after' },
  );
};

export const linkApprovedProduct = async (submissionId, productId) => {
  return await SellerSubmission.findByIdAndUpdate(
    submissionId,
    { approvedProductId: productId, status: "approved" },
    { returnDocument: 'after' },
  );
};
