/**
 * Merge Serial Routes — Protected (isAuth)
 * =========================================
 * GET    /api/merge-serial             — list all merge records
 * POST   /api/merge-serial/validate    — validate a single serial (existence + state)
 * POST   /api/merge-serial/merge       — pair two serials → create FG barcode
 * GET    /api/merge-serial/:fgSerial   — get FG merge details (public)
 */

const express = require("express");
const router = express.Router();

const mergeController = require("../controllers/mergeSerial");
const isAuth = require("../middleware/is-auth");

/**
 * GET /api/merge-serial
 * @summary List all merge records (paginated)
 * @query page, limit, poNumber, itemCode
 */
router.get("/", isAuth, mergeController.listMergeRecords);

/**
 * POST /api/merge-serial/validate
 * @summary Validate a single serial — checks existence, archived state, and merge status
 * @body { serialNumber: string }
 */
router.post("/validate", isAuth, mergeController.validateSerial);

/**
 * POST /api/merge-serial/merge
 * @summary Merge two serials into one Finished Good barcode
 * @body { serial1: string, serial2: string, mergedBy?: string }
 */
router.post("/merge", isAuth, mergeController.mergeSerials);

/**
 * GET /api/merge-serial/counts-by-item
 * @summary Aggregated merge counts per (itemCode, size) — consumed by the
 *          Production RM List to derive "pairs still available on the line".
 * @query itemCode, size, from, to
 * Must be declared BEFORE the :fgSerial catch-all route below.
 */
router.get("/counts-by-item", isAuth, mergeController.getCountsByItem);

/**
 * GET /api/merge-serial/:fgSerial
 * @summary Get merge record by FG serial number (public — used in QR links)
 */
router.get("/:fgSerial", mergeController.getMergeByFgSerial);

module.exports = router;
