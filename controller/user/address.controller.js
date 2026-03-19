import * as addressService from "../../services/address.service.js";
import { errorResponse } from "../../helper/response.helper.js";

export const showAddresses = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addresses = await addressService.getUserAddresses(userId);
    res.render("user/addresses", {
      user: req.session.user,
      addresses: addresses || [],
    });
  } catch (error) {
    console.error("Show addresses error:", error);
    res.status(500).render("error/500");
  }
};

export const getAddressesList = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addresses = await addressService.getUserAddresses(userId);
    res.json({ success: true, addresses: addresses || [] });
  } catch (error) {
    console.error("Get addresses list error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch addresses" });
  }
};

export const showAddAddress = (req, res) => {
  res.render("user/addaddress");
};

export const addAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      type,
      isDefault,
    } = req.body;

    if (
      !fullName ||
      !phone ||
      !addressLine1 ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Indian phone number",
      });
    }
    if (!/^\d{6}$/.test(postalCode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit postal code",
      });
    }

    const addressData = {
      userId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2 ? addressLine2.trim() : "",
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
      type: type || "home",
      isDefault: Boolean(isDefault),
    };

    const address = await addressService.createAddress(addressData);
    res.json({ success: true, message: "Address added successfully", address });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({ success: false, message: "Failed to add address" });
  }
};

export const showEditAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;
    const address = await addressService.getAddressById(addressId, userId);
    if (!address) return errorResponse(res, "Address not found", 404);
    res.render("user/editaddress", { address });
  } catch (error) {
    console.error("Show edit address error:", error);
    return errorResponse(res, "Server error", 500);
  }
};

export const updateAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;
    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      type,
      isDefault,
    } = req.body;

    if (
      !fullName ||
      !phone ||
      !addressLine1 ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Indian phone number",
      });
    }
    if (!/^\d{6}$/.test(postalCode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit postal code",
      });
    }

    const updateData = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2 ? addressLine2.trim() : "",
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
      type: type || "home",
      isDefault: Boolean(isDefault),
    };

    const address = await addressService.updateAddress(
      addressId,
      userId,
      updateData,
    );
    if (!address)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    res.json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update address" });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;
    const existingAddress = await addressService.getAddressById(
      addressId,
      userId,
    );
    if (!existingAddress)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    await addressService.deleteAddress(addressId, userId);
    res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete address" });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;
    const existingAddress = await addressService.getAddressById(
      addressId,
      userId,
    );
    if (!existingAddress)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    const address = await addressService.setDefaultAddress(addressId, userId);
    res.json({
      success: true,
      message: "Default address updated successfully",
      address,
    });
  } catch (error) {
    console.error("Set default address error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to set default address" });
  }
};
