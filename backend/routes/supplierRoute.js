const express = require("express");
const supplierController = require("../controllers/supplierController");
const supplierValidator = require("../validators/supplierValidator");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

// Public routes
router.post(
  "/v1/register",
  supplierValidator.registerValidation,
  supplierController.registerSupplier
);

router.post(
  "/v1/login",
  supplierValidator.loginValidation,
  supplierController.loginSupplier
);

// Forgot password flow (email OTP)
router.post(
  "/v1/forgot-password",
  supplierValidator.forgotPasswordValidation,
  supplierController.forgotPassword
);

// Resend uses the same handler; the 60s cooldown is enforced in the model
router.post(
  "/v1/resend-otp",
  supplierValidator.forgotPasswordValidation,
  supplierController.forgotPassword
);

router.post(
  "/v1/verify-otp",
  supplierValidator.verifyOtpValidation,
  supplierController.verifyPasswordResetOtp
);

router.post(
  "/v1/reset-password",
  supplierValidator.resetPasswordValidation,
  supplierController.resetPassword
);

// Protected routes (requires authentication)
router.get("/v1", isAuth, supplierController.getAllSuppliers);

router.get("/v1/:id", isAuth, supplierController.getSupplierById);

router.put(
  "/v1/:id",
  isAuth,
  supplierValidator.updateValidation,
  supplierController.updateSupplier
);

router.delete("/v1/:id", isAuth, supplierController.deleteSupplier);

// Admin route to update supplier status (approve/reject)
router.put(
  "/v1/:id/status",
  isAuth,
  supplierValidator.statusValidation,
  supplierController.updateSupplierStatus
);

module.exports = router;
