import * as userService from "../../shared/services/user.service.js";
import * as otpService from "../../shared/services/otp.service.js";
import * as emailService from "../../shared/services/email.service.js";
import * as addressService from "../../user/services/address.service.js";
import * as categoryService from "../../shared/services/category.service.js";
import { deleteImage } from "../../shared/config/cloudinary.config.js";
import {
  successResponse,
  errorResponse,
  getInitials,
  getAvatarColor,
} from "../../shared/helpers/response.helper.js";

export const showProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await userService.findUserById(userId);

    if (!user) {
      return res.redirect("/login");
    }

    const addresses = await addressService.getUserAddresses(userId);
    
    if (user.favoriteGenres && user.favoriteGenres.length > 0) {
      await user.populate('favoriteGenres');
    }

    res.render("user/profile", {
      user,
      addresses: addresses || [],
      initials: getInitials(user.firstName, user.lastName),
      avatarColor: getAvatarColor(user.firstName),
    });
  } catch (error) {
    res.status(500).send("Server Error");
  }
};

export const showEditProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await userService.findUserById(userId);

    if (!user) {
      return res.redirect("/login");
    }

    const categories = await categoryService.getMainCategoriesWithSubs();

    res.render("user/editprofile", {
      user,
      categories,
      initials: getInitials(user.firstName, user.lastName),
      avatarColor: getAvatarColor(user.firstName),
    });
  } catch (error) {
    res.status(500).send("Server Error");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      bio,
      favoriteGenre,
      favoriteGenres,
      primaryInterest,
      readingGoal,
    } = req.body;

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    const user = await userService.findUserById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone && phone.trim() ? phone.trim() : null,
      gender: gender && gender.trim() ? gender.trim() : null,
      bio: bio && bio.trim() ? bio.trim() : null,
      favoriteGenre:
        favoriteGenre && favoriteGenre.trim() ? favoriteGenre.trim() : null,
      favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres : [],
      primaryInterest:
        primaryInterest && primaryInterest.trim()
          ? primaryInterest.trim()
          : null,
      readingGoal: readingGoal ? parseInt(readingGoal) : null,
    };

    if (dateOfBirth && dateOfBirth.trim()) {
      const parsedDate = new Date(dateOfBirth);
      if (!isNaN(parsedDate.getTime())) {
        updateData.dateOfBirth = parsedDate;
      }
    } else {
      updateData.dateOfBirth = null;
    }

    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to update profile" });
    }

    if (req.session.user) {
      req.session.user.firstName = updatedUser.firstName;
      req.session.user.lastName = updatedUser.lastName;
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          dateOfBirth: updatedUser.dateOfBirth,
          gender: updatedUser.gender,
          bio: updatedUser.bio,
          favoriteGenre: updatedUser.favoriteGenre,
          favoriteGenres: updatedUser.favoriteGenres,
          primaryInterest: updatedUser.primaryInterest,
          readingGoal: updatedUser.readingGoal,
        },
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
};

export const requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.session.userId;

    if (!userId) return errorResponse(res, "Authentication required", 401);
    if (!newEmail) return errorResponse(res, "New email is required");

    const user = await userService.findUserById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    if (newEmail === user.email)
      return errorResponse(
        res,
        "New email must be different from current email",
      );

    const existingUser = await userService.findUserByEmail(newEmail);
    if (existingUser) return errorResponse(res, "Email already exists");

    const otp = otpService.generateOTP();

    user.emailChangeRequest = {
      newEmail: newEmail,
      otp: {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    };

    await user.save();
    await emailService.sendEmailChangeOTP(newEmail, user.firstName, otp);

    return successResponse(
      res,
      "OTP sent to new email address. Please verify to complete email change.",
    );
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const verifyEmailChange = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.session.userId;

    if (!otp) return errorResponse(res, "OTP is required");

    const user = await userService.findUserById(userId);
    if (!user || !user.emailChangeRequest)
      return errorResponse(res, "No email change request found");

    const now = new Date();
    const isValidOTP =
      user.emailChangeRequest.otp.code === otp &&
      now <= new Date(user.emailChangeRequest.otp.expiresAt);

    if (!isValidOTP) return errorResponse(res, "Invalid or expired OTP");

    const newEmail = user.emailChangeRequest.newEmail;
    user.email = newEmail;
    user.emailChangeRequest = undefined;
    await user.save();

    if (req.session.user) {
      req.session.user.email = newEmail;
    }

    return successResponse(res, "Email changed successfully", { newEmail });
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const cancelEmailChange = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await userService.findUserById(userId);
    if (user && user.emailChangeRequest) {
      user.emailChangeRequest = undefined;
      await user.save();
    }
    return successResponse(res, "Email change request cancelled");
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const showChangePassword = (req, res) => {
  res.render("user/changepassword");
};

export const removeProfilePicture = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await userService.findUserById(userId);
    if (!user) return errorResponse(res, "User not found", 404);
    if (!user.profilePicture)
      return errorResponse(res, "No profile picture to remove");

    try {
      const urlParts = user.profilePicture.split("/");
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExtension.split(".")[0];
      const fullPublicId = `papyrus/profile-pictures/${publicId}`;
      await deleteImage(fullPublicId);
    } catch (error) {}

    await userService.updateUser(userId, { profilePicture: null });

    return successResponse(res, "Profile picture removed successfully", {
      user: { profilePicture: null },
    });
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    const user = await userService.findUserById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    const isMatch = await userService.comparePassword(
      currentPassword,
      user.password,
    );
    if (!isMatch) return errorResponse(res, "Current password is incorrect");

    user.password = newPassword;
    await user.save();

    return successResponse(res, "Password changed successfully");
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const resendEmailOTP = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return errorResponse(res, "Authentication required", 401);

    const user = await userService.findUserById(userId);
    if (!user || !user.emailChangeRequest) {
      return errorResponse(res, "No email change request found");
    }

    const otp = otpService.generateOTP();

    user.emailChangeRequest.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    await user.save();
    await emailService.sendEmailChangeOTP(
      user.emailChangeRequest.newEmail,
      user.firstName,
      otp,
    );

    return successResponse(res, "OTP resent successfully");
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!req.file) return errorResponse(res, "No image file provided");

    const user = await userService.findUserById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    if (
      user.profilePicture &&
      !user.profilePicture.includes("default-avatar")
    ) {
      try {
        const urlParts = user.profilePicture.split("/");
        const publicId = `papyrus/profile-pictures/${urlParts[urlParts.length - 1].split(".")[0]}`;
        await deleteImage(publicId);
      } catch (err) {}
    }

    await userService.updateUser(userId, { profilePicture: req.file.path });

    return successResponse(res, "Avatar updated successfully", {
      user: { profilePicture: req.file.path },
    });
  } catch (error) {
    return errorResponse(res, "Server error", 500);
  }
};
