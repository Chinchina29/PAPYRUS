import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/shared/models/User.js";

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:");
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      return;
    }

    const adminData = {
      firstName: "Admin",
      lastName: "User",
      email: "admin@papyrus.com",
      password: "Admin123!",
      role: "admin",
      isVerified: true,
    };

    const admin = new User(adminData);
    await admin.save();

    console.log("Admin user created successfully!");
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    console.log("Please change the password after first login.");
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

createAdmin();
