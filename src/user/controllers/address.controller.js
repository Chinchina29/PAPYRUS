import HTTP_STATUS from "../../shared/constants/httpStatus.js";
import MESSAGES from "../../shared/constants/messages.js";
import * as addressService from "../../user/services/address.service.js";
import { errorResponse } from "../../shared/helpers/response.helper.js";
export const showAddresses = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addresses = await addressService.getUserAddresses(userId);
    res.render("user/addresses", {
      user: req.session.user,
      addresses: addresses || [],
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error/500");
  }
};
export const getAddressesList = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addresses = await addressService.getUserAddresses(userId);
    res.json({ success: true, addresses: addresses || [] });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_FETCH_ADDRESSES,
      });
  }
};
export const showAddAddress = (req, res) => {
  const from = req.query.from || null;
  res.render("user/addaddress", { from });
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

    if (!fullName || !fullName.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "fullName",
          message: "Full name is required.",
        });
    }
    if (fullName.trim().length < 3 || fullName.trim().length > 100) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "fullName",
          message: "Full name must be between 3 and 100 characters.",
        });
    }
    if (!phone || !phone.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "phone",
          message: "Phone number is required.",
        });
    }
    const phoneDigits = phone.replace(/\D/g, "").slice(-10);
    if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "phone",
          message:
            "Enter a valid 10-digit Indian mobile number starting with 6–9.",
        });
    }
    const normalizedPhone = "+91" + phoneDigits;
    if (!addressLine1 || !addressLine1.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "addressLine1",
          message: "Address Line 1 is required.",
        });
    }
    if (addressLine1.trim().length < 5 || addressLine1.trim().length > 200) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "addressLine1",
          message: "Address Line 1 must be between 5 and 200 characters.",
        });
    }
    if (addressLine2 && addressLine2.trim().length > 200) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "addressLine2",
          message: "Address Line 2 must not exceed 200 characters.",
        });
    }
    if (!city || !city.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, field: "city", message: "City is required." });
    }
    if (city.trim().length < 2 || city.trim().length > 100) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "city",
          message: "City must be between 2 and 100 characters.",
        });
    }
    if (!state || !state.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "state",
          message: "State is required.",
        });
    }
    if (state.trim().length < 2 || state.trim().length > 100) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "state",
          message: "State must be between 2 and 100 characters.",
        });
    }
    if (!postalCode || !postalCode.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "postalCode",
          message: "Postal code is required.",
        });
    }
    if (!/^\d{6}$/.test(postalCode)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "postalCode",
          message: "Enter a valid 6-digit PIN code.",
        });
    }
    if (!country || !country.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "country",
          message: "Country is required.",
        });
    }
    const addressData = {
      userId,
      fullName: fullName.trim(),
      phone: normalizedPhone,
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
    res.json({ success: true, message: MESSAGES.ADDRESS.ADDED, address });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.CUSTOM.FAILED_TO_ADD_ADDRESS });
  }
};
export const showEditAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;
    const address = await addressService.getAddressById(addressId, userId);
    if (!address)
      return errorResponse(
        res,
        MESSAGES.ADDRESS.NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    res.render("user/editaddress", { address });
  } catch (error) {
    return errorResponse(
      res,
      "Server error",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
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
    if (!fullName || !fullName.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "fullName",
          message: "Full name is required.",
        });
    }
    if (fullName.trim().length < 3 || fullName.trim().length > 100) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "fullName",
          message: "Full name must be between 3 and 100 characters.",
        });
    }
    if (!phone || !phone.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "phone",
          message: "Phone number is required.",
        });
    }
    const phoneDigits = phone.replace(/\D/g, "").slice(-10);
    if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "phone",
          message:
            "Enter a valid 10-digit Indian mobile number starting with 6–9.",
        });
    }
    const normalizedPhone = "+91" + phoneDigits;
    if (!addressLine1 || !addressLine1.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "addressLine1",
          message: "Address Line 1 is required.",
        });
    }
    if (addressLine1.trim().length < 5 || addressLine1.trim().length > 200) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "addressLine1",
          message: "Address Line 1 must be between 5 and 200 characters.",
        });
    }
    if (addressLine2 && addressLine2.trim().length > 200) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "addressLine2",
          message: "Address Line 2 must not exceed 200 characters.",
        });
    }
    if (!city || !city.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, field: "city", message: "City is required." });
    }
    if (city.trim().length < 2 || city.trim().length > 100) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "city",
          message: "City must be between 2 and 100 characters.",
        });
    }
    if (!state || !state.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "state",
          message: "State is required.",
        });
    }
    if (state.trim().length < 2 || state.trim().length > 100) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "state",
          message: "State must be between 2 and 100 characters.",
        });
    }
    if (!postalCode || !postalCode.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "postalCode",
          message: "Postal code is required.",
        });
    }
    if (!/^\d{6}$/.test(postalCode)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "postalCode",
          message: "Enter a valid 6-digit PIN code.",
        });
    }
    if (!country || !country.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          field: "country",
          message: "Country is required.",
        });
    }
    const updateData = {
      fullName: fullName.trim(),
      phone: normalizedPhone,
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
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ADDRESS.NOT_FOUND });
    res.json({
      success: true,
      message: MESSAGES.ADDRESS.UPDATED,
      address,
    });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_UPDATE_ADDRESS,
      });
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
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ADDRESS.NOT_FOUND });
    await addressService.deleteAddress(addressId, userId);
    res.json({ success: true, message: MESSAGES.ADDRESS.DELETED });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_DELETE_ADDRESS,
      });
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
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ADDRESS.NOT_FOUND });
    const address = await addressService.setDefaultAddress(addressId, userId);
    res.json({
      success: true,
      message: MESSAGES.CUSTOM.DEFAULT_ADDRESS_UPDATED_SUCCESSFULLY,
      address,
    });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.CUSTOM.FAILED_TO_SET_DEFAULT_ADDRESS,
      });
  }
};
