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
