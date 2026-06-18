import { body, validationResult } from "express-validator";
export const signupValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Passwords do not match");
      return true;
    }),
];
export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ max: 128 })
    .withMessage("Password must not exceed 128 characters"),
];
export const passwordResetValidation = [
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword)
        throw new Error("Passwords do not match");
      return true;
    }),
];
export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword)
        throw new Error("Passwords do not match");
      return true;
    }),
];
export const adminLoginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ max: 128 })
    .withMessage("Password must not exceed 128 characters"),
];
export const addressValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Full name can only contain letters and spaces"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone number must be between 10 and 15 digits")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid 10-digit phone number"),
  body("addressLine1")
    .trim()
    .notEmpty()
    .withMessage("Address line 1 is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("Address must be between 5 and 200 characters"),
  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("City can only contain letters and spaces"),
  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("State must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("State can only contain letters and spaces"),
  body("postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required")
    .matches(/^\d{6}$/)
    .withMessage("Please enter a valid 6-digit postal code"),
  body("type")
    .optional()
    .isIn(["home", "work", "other"])
    .withMessage("Invalid address type"),
];
export const profileUpdateValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage("Phone number must not exceed 15 characters")
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Phone number contains invalid characters"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must not exceed 500 characters"),
  body("favoriteGenre")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Favorite genre must not exceed 50 characters"),
  body("primaryInterest")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Primary interest must not exceed 50 characters"),
  body("readingGoal")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Reading goal must be between 1 and 365"),
];
export const emailChangeValidation = [
  body("newEmail")
    .trim()
    .notEmpty()
    .withMessage("New email is required")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
];
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = {};
    const errorMessages = [];
    errors.array().forEach((error) => {
      formattedErrors[error.path] = error.msg;
      errorMessages.push(`${error.path}: ${error.msg}`);
    });
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${errorMessages.join(', ')}`,
      errors: errors.array(),
      fieldErrors: formattedErrors,
      failedField: errors.array()[0].path
    });
  }
  next();
};