const express = require("express");
const router = express.Router();

const binLocationController = require("../controllers/binLocation");
const binLocationValidator = require("../validators/binLocation");
const isAuth = require("../middleware/is-auth");

// Get bin locations with pagination and search
router.get("/v1", binLocationController.getBinLocations);

// Get all bin locations without pagination
router.get("/v1/all", isAuth, binLocationController.getAllBinLocations);

// Get bin location by ID
router.get("/v1/:id", binLocationController.getBinLocationById);

// Get bin location by bin number
router.get(
  "/v1/search/binNumber",
  binLocationController.getBinLocationByBinNumber
);

// Get bin locations by zone
router.get("/v1/search/zone", binLocationController.getBinLocationsByZone);

// Get bin locations by warehouse
router.get(
  "/v1/search/warehouse",
  binLocationController.getBinLocationsByWarehouse
);

// Create bin location
router.post(
  "/v1",
  isAuth,
  binLocationValidator.createBinLocation,
  binLocationController.createBinLocation
);

// Update bin location
router.put(
  "/v1/:id",
  isAuth,
  binLocationValidator.updateBinLocation,
  binLocationController.updateBinLocation
);

// Delete bin location
router.delete("/v1/:id", isAuth, binLocationController.deleteBinLocation);

// Delete multiple bin locations
router.delete(
  "/v1/bulk/delete",
  isAuth,
  binLocationController.deleteMultipleBinLocations
);

module.exports = router;
