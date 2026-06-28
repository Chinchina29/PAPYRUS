import WalletTransaction from "../../shared/models/WalletTransaction.js";
import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";

export const getWalletLedger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = {};
    if (req.query.search) {
    }
    const total = await WalletTransaction.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;
    const transactions = await WalletTransaction.find(query)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.render("admin/wallet", {
      title: "Wallet Ledger",
      transactions,
      currentPage: page,
      totalPages,
      total,
      search: req.query.search || "",
      currentPage_name: "wallet",
      user: req.session.adminUser,
      error: null,
    });
  } catch (error) {
    console.error("Error fetching wallet ledger:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("admin/wallet", {
      title: "Wallet Ledger",
      transactions: [],
      currentPage: 1,
      totalPages: 1,
      total: 0,
      search: "",
      currentPage_name: "wallet",
      user: req.session.adminUser,
      error: "Failed to load wallet transactions.",
    });
  }
};

export const exportWalletCSV = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({})
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    const csvRows = [];
    csvRows.push(['Transaction ID', 'Date', 'Type', 'Amount', 'User Name', 'User Email', 'Description'].join(','));

    transactions.forEach(tx => {
      const row = [
        `TXN-${tx._id.toString().substring(0, 6).toUpperCase()}`,
        new Date(tx.createdAt).toLocaleDateString('en-US'),
        tx.type.toUpperCase(),
        tx.amount.toFixed(2),
        tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : 'N/A',
        tx.user ? tx.user.email : 'N/A',
        `"${tx.description || 'No description'}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=wallet-transactions-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR
    });
  }
};

export const getTransactionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await WalletTransaction.findById(id)
      .populate("user", "firstName lastName email")
      .populate("orderId", "orderId totalAmount orderStatus");

    if (!transaction) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Transaction not found"
      });
    }

    res.json({
      success: true,
      transaction: {
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
        user: transaction.user ? {
          firstName: transaction.user.firstName,
          lastName: transaction.user.lastName,
          email: transaction.user.email
        } : null,
        orderId: transaction.orderId ? {
          orderId: transaction.orderId.orderId,
          totalAmount: transaction.orderId.totalAmount,
          orderStatus: transaction.orderId.orderStatus
        } : null
      }
    });
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.COMMON.INTERNAL_ERROR
    });
  }
};
