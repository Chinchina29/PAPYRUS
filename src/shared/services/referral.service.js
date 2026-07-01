import User from "../models/User.js";
import Referral from "../models/Referral.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Notification from "../models/Notification.js";
import crypto from "crypto";

const REFERRAL_SETTINGS = {
  REFERRER_REWARD: 100,
  REFEREE_REWARD: 50,
  CODE_LENGTH: 8,
};

export const generateReferralCode = async () => {
  let referralCode;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    referralCode = crypto
      .randomBytes(REFERRAL_SETTINGS.CODE_LENGTH / 2)
      .toString("hex")
      .toUpperCase()
      .substring(0, REFERRAL_SETTINGS.CODE_LENGTH);

    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique referral code");
  }

  return referralCode;
};

export const validateReferralCode = async (referralCode, newUserEmail) => {
  if (!referralCode || referralCode.trim() === "") {
    return { isValid: true };
  }

  const code = referralCode.trim().toUpperCase();

  const referrer = await User.findOne({ referralCode: code });

  if (!referrer) {
    return {
      isValid: false,
      message: "Invalid referral code",
    };
  }

  if (referrer.isBlocked) {
    return {
      isValid: false,
      message: "This referral code is no longer valid",
    };
  }

  if (referrer.email.toLowerCase() === newUserEmail.toLowerCase()) {
    return {
      isValid: false,
      message: "You cannot use your own referral code",
    };
  }

  return {
    isValid: true,
    referrerId: referrer._id,
    referralCode: code,
  };
};

export const createReferralRecord = async (
  referrerId,
  refereeId,
  referralCode
) => {
  const referral = new Referral({
    referrer: referrerId,
    referee: refereeId,
    referralCode,
    referrerReward: REFERRAL_SETTINGS.REFERRER_REWARD,
    refereeReward: REFERRAL_SETTINGS.REFEREE_REWARD,
  });

  await referral.save();

  await User.findByIdAndUpdate(refereeId, {
    referredBy: referrerId,
  });

  return referral;
};

export const distributeRefereeReward = async (refereeId) => {
  const referral = await Referral.findOne({
    referee: refereeId,
    refereeRewardPaid: false,
  });

  if (!referral) {
    return { success: false, message: "No pending referral reward found" };
  }

  const referee = await User.findById(refereeId);
  if (!referee) {
    return { success: false, message: "Referee user not found" };
  }

  referee.walletBalance += referral.refereeReward;
  await referee.save();

  const transaction = new WalletTransaction({
    user: refereeId,
    type: "credit",
    amount: referral.refereeReward,
    description: `Welcome bonus for joining via referral`,
  });
  await transaction.save();

  referral.refereeRewardPaid = true;
  await referral.save();

  await Notification.create({
    user: refereeId,
    message: `Welcome! You've received ₹${referral.refereeReward} as a signup bonus.`,
    type: "wallet",
  });

  const referrer = await User.findById(referral.referrer);
  if (referrer) {
    await Notification.create({
      user: referral.referrer,
      message: `${referee.firstName} ${referee.lastName} signed up using your referral code!`,
      type: "referral",
    });
  }

  return {
    success: true,
    message: "Referee reward distributed successfully",
    amount: referral.refereeReward,
  };
};

export const distributeReferrerReward = async (refereeId) => {
  const referral = await Referral.findOne({
    referee: refereeId,
    referrerRewardPaid: false,
  });

  if (!referral) {
    return { success: false, message: "No pending referral reward found" };
  }

  const referrer = await User.findById(referral.referrer);
  if (!referrer) {
    return { success: false, message: "Referrer user not found" };
  }

  referrer.walletBalance += referral.referrerReward;
  referrer.referralCount += 1;
  referrer.referralEarnings += referral.referrerReward;
  await referrer.save();

  const transaction = new WalletTransaction({
    user: referral.referrer,
    type: "credit",
    amount: referral.referrerReward,
    description: `Referral bonus - your friend completed their first order`,
  });
  await transaction.save();

  referral.referrerRewardPaid = true;
  referral.status = "completed";
  referral.firstOrderDate = new Date();
  await referral.save();

  await Notification.create({
    user: referral.referrer,
    message: `You've earned ₹${referral.referrerReward} as referral reward! Your friend completed their first order.`,
    type: "wallet",
  });

  return {
    success: true,
    message: "Referrer reward distributed successfully",
    amount: referral.referrerReward,
  };
};

export const getReferralHistory = async (userId) => {
  const referrals = await Referral.find({ referrer: userId })
    .populate("referee", "firstName lastName email createdAt")
    .sort({ createdAt: -1 });

  return referrals.map((ref) => ({
    refereeName: `${ref.referee.firstName} ${ref.referee.lastName}`,
    refereeEmail: ref.referee.email,
    signupDate: ref.createdAt,
    status: ref.status,
    rewardPaid: ref.referrerRewardPaid,
    rewardAmount: ref.referrerReward,
    firstOrderDate: ref.firstOrderDate,
  }));
};

export const getReferralStats = async (userId) => {
  const user = await User.findById(userId).select(
    "referralCode referralCount referralEarnings"
  );

  const pendingReferrals = await Referral.countDocuments({
    referrer: userId,
    status: "pending",
  });

  const completedReferrals = await Referral.countDocuments({
    referrer: userId,
    status: "completed",
  });

  return {
    referralCode: user.referralCode,
    totalReferrals: user.referralCount,
    totalEarnings: user.referralEarnings,
    pendingReferrals,
    completedReferrals,
  };
};

export const regenerateReferralCode = async (userId) => {
  const newCode = await generateReferralCode();

  await User.findByIdAndUpdate(userId, {
    referralCode: newCode,
  });

  return {
    success: true,
    referralCode: newCode,
    message: "Referral code regenerated successfully",
  };
};

export const getAdminReferralStats = async () => {
  const totalReferrals = await Referral.countDocuments();
  const completedReferrals = await Referral.countDocuments({
    status: "completed",
  });
  const pendingReferrals = await Referral.countDocuments({ status: "pending" });

  const totalReferrerRewards = await Referral.aggregate([
    { $match: { referrerRewardPaid: true } },
    { $group: { _id: null, total: { $sum: "$referrerReward" } } },
  ]);

  const totalRefereeRewards = await Referral.aggregate([
    { $match: { refereeRewardPaid: true } },
    { $group: { _id: null, total: { $sum: "$refereeReward" } } },
  ]);

  const topReferrers = await User.find({ referralCount: { $gt: 0 } })
    .select("firstName lastName email referralCount referralEarnings")
    .sort({ referralCount: -1 })
    .limit(10);

  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    totalReferrerRewards:
      totalReferrerRewards.length > 0 ? totalReferrerRewards[0].total : 0,
    totalRefereeRewards:
      totalRefereeRewards.length > 0 ? totalRefereeRewards[0].total : 0,
    topReferrers: topReferrers.map((user) => ({
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      referralCount: user.referralCount,
      earnings: user.referralEarnings,
    })),
  };
};

export const getAllReferrals = async (searchQuery = "", statusFilter = "") => {
  const query = {};

  if (statusFilter && statusFilter !== "all") {
    query.status = statusFilter;
  }

  let referrals = await Referral.find(query)
    .populate("referrer", "firstName lastName email")
    .populate("referee", "firstName lastName email")
    .sort({ createdAt: -1 });

  if (searchQuery) {
    const search = searchQuery.toLowerCase();
    referrals = referrals.filter(
      (ref) =>
        ref.referrer.email.toLowerCase().includes(search) ||
        ref.referee.email.toLowerCase().includes(search) ||
        `${ref.referrer.firstName} ${ref.referrer.lastName}`
          .toLowerCase()
          .includes(search) ||
        `${ref.referee.firstName} ${ref.referee.lastName}`
          .toLowerCase()
          .includes(search)
    );
  }

  return referrals.map((ref) => ({
    id: ref._id,
    referrerName: `${ref.referrer.firstName} ${ref.referrer.lastName}`,
    referrerEmail: ref.referrer.email,
    refereeName: `${ref.referee.firstName} ${ref.referee.lastName}`,
    refereeEmail: ref.referee.email,
    referralCode: ref.referralCode,
    status: ref.status,
    referrerReward: ref.referrerReward,
    referrerRewardPaid: ref.referrerRewardPaid,
    refereeReward: ref.refereeReward,
    refereeRewardPaid: ref.refereeRewardPaid,
    createdAt: ref.createdAt,
    firstOrderDate: ref.firstOrderDate,
  }));
};
