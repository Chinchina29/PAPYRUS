import Address from "../../shared/models/Address.js";
export const getUserAddresses = async (userId) => {
    return await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
};
export const getAddressById = async (addressId, userId) => {
    return await Address.findOne({ _id: addressId, userId });
};
export const createAddress = async (addressData) => {
    const address = new Address(addressData);
    return await address.save();
};
export const updateAddress = async (addressId, userId, updateData) => {
    return await Address.findOneAndUpdate(
        { _id: addressId, userId },
        updateData,
        { returnDocument: 'after' }
    );
};
export const deleteAddress = async (addressId, userId) => {
    return await Address.findOneAndDelete({ _id: addressId, userId });
};
export const setDefaultAddress = async (addressId, userId) => {
    await Address.updateMany({ userId }, { isDefault: false });
    return await Address.findOneAndUpdate(
        { _id: addressId, userId },
        { isDefault: true },
        { returnDocument: 'after' }
    );
};
export const getDefaultAddress = async (userId) => {
    return await Address.findOne({ userId, isDefault: true });
};
