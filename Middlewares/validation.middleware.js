import { body, validationResult } from 'express-validator';

export const signupValidation = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    
    body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

export const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
];

export const passwordResetValidation = [
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

export const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

export const adminLoginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
];

export const addressValidation = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit phone number'),
    
    body('addressLine1')
        .trim()
        .notEmpty().withMessage('Address line 1 is required')
        .isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
    
    body('city')
        .trim()
        .notEmpty().withMessage('City is required')
        .isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
    
    body('state')
        .trim()
        .notEmpty().withMessage('State is required')
        .isLength({ min: 2 }).withMessage('State must be at least 2 characters'),
    
    body('postalCode')
        .trim()
        .notEmpty().withMessage('Postal code is required')
        .matches(/^[1-9][0-9]{5}$/).withMessage('Please enter a valid 6-digit postal code'),
    
    body('type')
        .optional()
        .isIn(['home', 'work', 'other']).withMessage('Invalid address type')
];

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ Validation failed:');
        console.log('📝 Request body:', req.body);
        console.log('🚫 Validation errors:', errors.array());
        
        return res.status(400).json({ 
            success: false,
            message: 'Validation failed',
            errors: errors.array() 
        });
    }
    next();
};
