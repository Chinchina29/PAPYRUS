import User from "../models/User.js";
import bcrypt from "bcryptjs";
export const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};
export const findUserById = async (id) => {
  if (!id || typeof id !== "string" && !id._id) return null;
  const strId = id._id ? id._id.toString() : id.toString();
  if (strId.length !== 24) return null;
  return await User.findById(strId);
};
export const createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};
export const deleteUser = async (userId) => {
  return await User.deleteOne({ _id: userId });
};
export const comparePassword = async (plainPassword, hashedPassword) => {
  const result = await bcrypt.compare(plainPassword, hashedPassword);
  return result;
};
export const updateUser = async (userId, updateData) => {
  try {
    const result = await User.findByIdAndUpdate(userId, updateData, { returnDocument: 'after' });
    return result;
  } catch (error) {
    throw error;
  }
};
export const getUserById = async (userId) => {
  return await User.findById(userId).select("-password");
};
export const getAllUsers = async (
  page = 1,
  limit = 10,
  search = "",
  status = "",
) => {
  const skip = (page - 1) * limit;
  let query = { role: "user" };
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (status === "active") {
    query.isBlocked = false;
  } else if (status === "blocked") {
    query.isBlocked = true;
  }
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-password");
  const total = await User.countDocuments(query);
  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
export const toggleBlockUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }
  user.isBlocked = !user.isBlocked;
  await user.save();
  return user;
};
export const getTotalUsers = async () => {
  return await User.countDocuments({ role: "user" });
};
export const getActiveUsers = async () => {
  return await User.countDocuments({ role: "user", isBlocked: false });
};
export const getBlockedUsers = async () => {
  return await User.countDocuments({ role: "user", isBlocked: true });
};
export const getRecentUsers = async (limit = 5) => {
  return await User.find({ role: "user" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("firstName lastName email createdAt isBlocked");
};
export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalUsers = await User.countDocuments({ role: "user" });
  const activeUsers = await User.countDocuments({
    role: "user",
    isBlocked: false,
  });
  const blockedUsers = await User.countDocuments({
    role: "user",
    isBlocked: true,
  });
  const newUsersToday = await User.countDocuments({
    role: "user",
    createdAt: { $gte: today },
  });
  return {
    totalUsers,
    activeUsers,
    blockedUsers,
    newUsersToday,
  };
};
