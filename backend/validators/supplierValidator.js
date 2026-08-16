const { body } = require("express-validator");

/**
 * Validation rules for supplier registration
 */
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Supplier name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

/**
 * Validation rules for supplier login
 */
const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

/**
 * Validation rules for updating supplier status
 */
const statusValidation = [
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Status must be one of: pending, approved, rejected"),
];

/**
 * Validation rules for updating supplier
 */
const updateValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];

/**
 * Validation rules for requesting a password reset OTP
 */
const forgotPasswordValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];

/**
 * Validation rules for verifying a password reset OTP
 */
const verifyOtpValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits")
    .isNumeric()
    .withMessage("Verification code must contain digits only"),
];

/**
 * Validation rules for resetting the password with a verified token
 */
const resetPasswordValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("resetToken")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

module.exports = {
  registerValidation,
  loginValidation,
  statusValidation,
  updateValidation,
  forgotPasswordValidation,
  verifyOtpValidation,
  resetPasswordValidation,
};
