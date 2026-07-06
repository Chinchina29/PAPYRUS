import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import User from "../../shared/models/User.js";
import WalletTransaction from "../../shared/models/WalletTransaction.js";
export const getWallet = async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(userId).select("walletBalance");
    if (!user) {
      return res.redirect("/login");
    }
    
    const total = await WalletTransaction.countDocuments({ user: userId });
    const totalPages = Math.ceil(total / limit) || 1;
    
    const transactions = await WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("orderId", "orderId");
    
    res.render("user/wallet", {
      walletBalance: user.walletBalance || 0,
      transactions,
      currentPage: page,
      totalPages,
      total,
      currentPage_name: "wallet",
      user: req.session.user || null,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("user/wallet", {
      walletBalance: 0,
      transactions: [],
      currentPage: 1,
      totalPages: 1,
      total: 0,
      currentPage_name: "wallet",
      user: req.session.user || null,
      error: MESSAGES.COMMON.INTERNAL_ERROR,
    });
  }
};
