/**
 * Digital Link Routes — PUBLIC (no auth required)
 * ================================================
 * GET /api/digital-link/:serialNumber
 */

const express = require("express");
const router = express.Router();

const digitalLinkController = require("../controllers/digitalLink");

/**
 * GET /api/digital-link/:serialNumber
 * @summary Get full product + supply chain traceability data for a serial number
 * @description Public endpoint — no authentication required.
 *              This URL is embedded in QR codes printed on each shoe label.
 */
router.get("/:serialNumber", digitalLinkController.getDigitalLink);

module.exports = router;
