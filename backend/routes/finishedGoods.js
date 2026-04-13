/**
 * Finished Goods Routes
 * =====================
 * Read-only views over MergeRecord, enriched with product info.
 *
 * GET /api/finished-goods             — list (paginated, filters)
 * GET /api/finished-goods/stats       — dashboard stats
 * GET /api/finished-goods/grouped     — grouped by item + size (card view)
 * GET /api/finished-goods/:fgSerial   — full FG trace (PUBLIC — for QR scan)
 */

const express = require("express");
const router = express.Router();

const finishedGoodsController = require("../controllers/finishedGoods");
const isAuth = require("../middleware/is-auth");

// Protected — admin screens
router.get("/", isAuth, finishedGoodsController.listFinishedGoods);
router.get("/stats", isAuth, finishedGoodsController.getFinishedGoodsStats);
router.get("/grouped", isAuth, finishedGoodsController.getFinishedGoodsGrouped);

// PUBLIC — trace page (QR code destination)
router.get("/:fgSerial", finishedGoodsController.getFinishedGoodTrace);

module.exports = router;
