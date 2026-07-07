const express = require("express");

const itemCodesController = require("../controllers/tblItemCodes1S1Br");
const itemCodesValidators = require("../validators/tblItemCodes1S1Br");
const isAuth = require("../middleware/is-auth");
const { uploadSingle } = require("multermate");

const PATH = "uploads/itemCodes";
const router = express.Router();
const upload = uploadSingle({
  destination: PATH,
  filename: "image",
});

router.get("/v1/itemCodes", itemCodesController.getItemCodes);

router.get("/v1/itemCodes/all", isAuth, itemCodesController.getAllItemCodes);

/**
 * GET /v1/itemCodes/search?search=value
 * Search item codes by ItemCode field, returns top 20 matching records
 */
router.get("/v1/itemCodes/search", isAuth, itemCodesController.searchItemCodes);

router.post(
  "/v1/itemCode",
  isAuth,
  itemCodesValidators.postItemCode,
  itemCodesController.postItemCode
);

router.post(
  "/v2/itemCode",
  isAuth,
  upload,
  itemCodesValidators.postItemCode,
  itemCodesController.postItemCodeV2
);

router.put(
  "/v1/itemCodes/bulk",
  isAuth,
  upload,
  itemCodesController.putMultipleItemCodes
);

router.put(
  "/v1/itemCode/:GTIN",
  isAuth,
  upload,
  itemCodesController.putItemCode
);

router.delete("/v1/itemCode/:GTIN", isAuth, itemCodesController.deleteItemCode);

router.get("/v1/searchByGTIN", itemCodesController.searchByPartialGTIN);

router.get("/v2/searchByGTIN", itemCodesController.searchByGTIN);

router.get("/v1/findByItemCode", itemCodesController.findByItemCode);


router.get(
  "/v1/download-products",
  itemCodesController.downloadAllProducts
);

router.post(
  "/v1/bulk-import",

  upload,
  itemCodesController.bulkImportFromExcel
);

router.get(
  "/v1/check-duplicates",
  itemCodesController.checkDuplicateGTINs
);

router.delete(
  "/v1/remove-duplicates",

  itemCodesController.removeDuplicateGTINs
);

// router.delete(
//   "/v1/delete-all",

//   itemCodesController.deleteAllBarcodes
// );

router.delete(
  "/v1/delete-without-barcode",

  itemCodesController.deleteItemsWithoutBarcode
);

module.exports = router;
