const express = require("express");
const router = express.Router();

const controlSerialController = require("../controllers/controlSerial");
const controlSerialValidator = require("../validators/controlSerial");
const isAuth = require("../middleware/is-auth");
const isSupplierAuth = require("../middleware/is-supplier-auth");

/**
 * POST /api/controlSerials
 * Create bulk control serials
 * Body: { ItemCode: string, qty: number, supplierId: string, poNumber: string, size?: string }
 */
router.post(
  "/",
  isAuth,
  controlSerialValidator.createControlSerials,
  controlSerialController.createControlSerials
);

/**
 * GET /api/controlSerials
 * Get all control serials with pagination
 * Query: ?page=1&limit=10&search=value&poNumber=value&supplierId=value
 */
router.get("/", isAuth, controlSerialController.getControlSerials);

/**
 * GET /api/controlSerials/all
 * Get all control serials without pagination
 */
router.get("/all", isAuth, controlSerialController.getAllControlSerials);

/**
 * GET /api/controlSerials/search/by-itemcode?ItemCode=value
 * Search control serials by ItemCode
 */
router.get(
  "/search/by-itemcode",
  isAuth,
  controlSerialController.searchByItemCode
);

/**
 * GET /api/controlSerials/search/by-serial?serialNumber=value
 * Search control serial by serial number
 */
router.get(
  "/search/by-serial",
  isAuth,
  controlSerialController.searchBySerialNumber
);

/**
 * POST /api/controlSerials/send-by-po
 * Body: { poNumber: string }
 * Trigger sending notification emails for all unsent control serials of a given PO number
 */
router.post(
  "/send-by-po",
  isAuth,
  controlSerialController.sendControlSerialsByPoNumber
);

/**
 * GET /api/controlSerials/search/by-po?poNumber=value
 * Search control serials by PO number
 */
router.get("/search/by-po", isAuth, controlSerialController.searchByPoNumber);

/**
 * GET /api/controlSerials/supplier/po-numbers
 * Get unique PO numbers with supplier details for authenticated supplier
 * Requires supplier bearer token
 */
router.get(
  "/supplier/po-numbers",
  isAuth,
  controlSerialController.getSupplierPoNumbersWithSupplierDetails
);

/**
 * GET /api/controlSerials/po-numbers
 * Get unique PO numbers with supplier details
 */
router.get(
  "/po-numbers",
  isAuth,
  controlSerialController.getPoNumbersWithSupplierDetails
);

/**
 * GET /api/controlSerials/po-numbers-with-total-qty
 * Get unique PO numbers with combined total qty across all sizes
 * Query: ?isArchived=true|false (optional)
 */
router.get(
  "/po-numbers-with-total-qty",
  isAuth,
  controlSerialController.getUniquePONumbersWithTotalQty
);

/**
 * GET /api/controlSerials/po-details?poNumber=value
 * Get all control serial details for a specific PO number grouped by size
 */
router.get(
  "/po-details",
  isAuth,
  controlSerialController.getControlSerialDetailsByPONumber
);

/**
 * POST /api/controlSerials/archive/by-po
 * Body: { poNumber: string }
 * Archive all control serials for a given PO number
 */
router.post(
  "/archive/by-po",
  isAuth,
  controlSerialController.archiveControlSerialsByPoNumber
);

/**
 * POST /api/controlSerials/unarchive/by-po
 * Body: { poNumber: string }
 * Unarchive all control serials for a given PO number
 */
router.post(
  "/unarchive/by-po",
  isAuth,
  controlSerialController.unarchiveControlSerialsByPoNumber
);

/**
 * GET /api/controlSerials/:id
 * Get control serial by ID
 */
router.get("/:id", isAuth, controlSerialController.getControlSerialById);

/**
 * PUT /api/controlSerials/update/by-po
 * Body: { poNumber: string, size: string, binLocationId?: string }
 * Update all control serials for a given PO number and size
 */
router.put(
  "/put-away",
  isAuth,
  controlSerialValidator.updateControlSerialsByPoNumber,
  controlSerialController.putAway
);

/**
 * PUT /api/controlSerials/:id
 * Update control serial
 * Body: { ItemCode: string }
 */
router.put(
  "/:id",
  isAuth,
  controlSerialValidator.updateControlSerial,
  controlSerialController.updateControlSerial
);

/**
 * DELETE /api/controlSerials/:id
 * Delete control serial
 */
router.delete("/:id", isAuth, controlSerialController.deleteControlSerial);

module.exports = router;
