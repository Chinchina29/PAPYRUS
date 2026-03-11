import * as addressService from '../../services/address.service.js';
import { successResponse, errorResponse, redirectResponse } from '../../helper/response.helper.js';

export const showAddresses = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addresses = await addressService.getUserAddresses(userId);
        
        res.render('user/addresses', { addresses });
    } catch (error) {
        console.error('Show addresses error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const showAddAddress = (req, res) => {
    res.render('user/addaddress');
};

export const addAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressData = {
            ...req.body,
            userId,
            isDefault: req.body.isDefault === 'on'
        };
        
        const address = await addressService.createAddress(addressData);
        return redirectResponse(res, 'Address added successfully', '/profile/addresses');
    } catch (error) {
        console.error('Add address error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const showEditAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        
        const address = await addressService.getAddressById(addressId, userId);
        if (!address) {
            return errorResponse(res, 'Address not found', 404);
        }
        
        res.render('user/editaddress', { address });
    } catch (error) {
        console.error('Show edit address error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const updateAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        const updateData = {
            ...req.body,
            isDefault: req.body.isDefault === 'on'
        };
        
        const address = await addressService.updateAddress(addressId, userId, updateData);
        if (!address) {
            return errorResponse(res, 'Address not found', 404);
        }
        
        return redirectResponse(res, 'Address updated successfully', '/profile/addresses');
    } catch (error) {
        console.error('Update address error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        
        const address = await addressService.deleteAddress(addressId, userId);
        if (!address) {
            return errorResponse(res, 'Address not found', 404);
        }
        
        return successResponse(res, 'Address deleted successfully');
    } catch (error) {
        console.error('Delete address error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        
        const address = await addressService.setDefaultAddress(addressId, userId);
        if (!address) {
            return errorResponse(res, 'Address not found', 404);
        }
        
        return successResponse(res, 'Default address updated successfully');
    } catch (error) {
        console.error('Set default address error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};