const { validationResult } = require("express-validator");

const BinLocationModel = require("../models/binLocation");
const generateResponse = require("../utils/response");
const CustomError = require("../exceptions/customError");

// Get all bin locations with pagination
exports.getBinLocations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || null;

    const result = await BinLocationModel.findAllWithPagination(
      page,
      limit,
      search
    );
    const { binLocations, pagination } = result;

    if (!binLocations || binLocations.length <= 0) {
      const error = new CustomError("No bin locations found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json(
      generateResponse(200, true, "Bin locations retrieved successfully", {
        binLocations,
        pagination,
      })
    );
  } catch (error) {
    next(error);
  }
};

// Get all bin locations without pagination
exports.getAllBinLocations = async (req, res, next) => {
  try {
    const result = await BinLocationModel.findAll();

    if (!result || result.length <= 0) {
      const error = new CustomError("No bin locations found");
      error.statusCode = 404;
      return next(error);
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Bin locations retrieved successfully",
          result
        )
      );
  } catch (error) {
    console.log(error);
    if (error instanceof CustomError) {
      return next(error);
    }
    error.message = null;
    next(error);
  }
};

// Get bin location by ID
exports.getBinLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const binLocation = await BinLocationModel.findById(id);

    if (!binLocation) {
      const error = new CustomError("Bin location not found");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Bin location retrieved successfully",
          binLocation
        )
      );
  } catch (error) {
    next(error);
  }
};

// Get bin location by bin number
exports.getBinLocationByBinNumber = async (req, res, next) => {
  try {
    const { binNumber } = req.query;

    if (!binNumber) {
      const error = new CustomError("Bin number is required");
      error.statusCode = 400;
      throw error;
    }

    const binLocation = await BinLocationModel.findByBinNumber(binNumber);

    if (!binLocation) {
      const error = new CustomError("Bin location not found");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Bin location retrieved successfully",
          binLocation
        )
      );
  } catch (error) {
    next(error);
  }
};

// Get bin locations by zone
exports.getBinLocationsByZone = async (req, res, next) => {
  try {
    const { zoneCode } = req.query;

    if (!zoneCode) {
      const error = new CustomError("Zone code is required");
      error.statusCode = 400;
      throw error;
    }

    const binLocations = await BinLocationModel.findByZone(zoneCode);

    if (!binLocations || binLocations.length <= 0) {
      const error = new CustomError("No bin locations found for this zone");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Bin locations retrieved successfully",
          binLocations
        )
      );
  } catch (error) {
    next(error);
  }
};

// Get bin locations by warehouse
exports.getBinLocationsByWarehouse = async (req, res, next) => {
  try {
    const { groupWarehouse } = req.query;

    if (!groupWarehouse) {
      const error = new CustomError("Group warehouse is required");
      error.statusCode = 400;
      throw error;
    }

    const binLocations = await BinLocationModel.findByWarehouse(groupWarehouse);

    if (!binLocations || binLocations.length <= 0) {
      const error = new CustomError(
        "No bin locations found for this warehouse"
      );
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Bin locations retrieved successfully",
          binLocations
        )
      );
  } catch (error) {
    next(error);
  }
};

// Create bin location
exports.createBinLocation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const {
      groupWarehouse,
      zoneCode,
      zones,
      zoneName,
      binNumber,
      zoned,
      zoneType,
      binType,
      binHeight,
      binRow,
      binWidth,
      binTotalSize,
      gln,
      longitude,
      latitude,
      sgln,
      mapLocation,
      minQuantity,
      availableQty,
      maxQuantity,
      capacityUsage,
    } = req.body;

    const data = {
      groupWarehouse,
      zoneCode,
      zones,
      zoneName,
      binNumber,
      zoned,
      zoneType,
      binType,
      binHeight: binHeight ? parseFloat(binHeight) : null,
      binRow,
      binWidth: binWidth ? parseFloat(binWidth) : null,
      binTotalSize: binTotalSize ? parseFloat(binTotalSize) : null,
      gln,
      longitude: longitude ? parseFloat(longitude) : null,
      latitude: latitude ? parseFloat(latitude) : null,
      sgln,
      mapLocation,
      minQuantity: minQuantity ? parseInt(minQuantity, 10) : null,
      availableQty: availableQty ? parseInt(availableQty, 10) : null,
      maxQuantity: maxQuantity ? parseInt(maxQuantity, 10) : null,
      capacityUsage: capacityUsage ? parseFloat(capacityUsage) : 0,
    };

    const binLocation = await BinLocationModel.create(data);

    res
      .status(201)
      .json(
        generateResponse(
          201,
          true,
          "Bin location created successfully",
          binLocation
        )
      );
  } catch (error) {
    next(error);
  }
};

// Update bin location
exports.updateBinLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const existingBinLocation = await BinLocationModel.findById(id);

    if (!existingBinLocation) {
      const error = new CustomError("Bin location not found");
      error.statusCode = 404;
      throw error;
    }

    const {
      groupWarehouse,
      zoneCode,
      zones,
      zoneName,
      binNumber,
      zoned,
      zoneType,
      binType,
      binHeight,
      binRow,
      binWidth,
      binTotalSize,
      gln,
      longitude,
      latitude,
      sgln,
      mapLocation,
      minQuantity,
      availableQty,
      maxQuantity,
      capacityUsage,
    } = req.body;

    // Prepare the updated data (only include fields that are provided)
    const updatedData = {
      groupWarehouse:
        groupWarehouse !== undefined
          ? groupWarehouse
          : existingBinLocation.groupWarehouse,
      zoneCode:
        zoneCode !== undefined ? zoneCode : existingBinLocation.zoneCode,
      zones: zones !== undefined ? zones : existingBinLocation.zones,
      zoneName:
        zoneName !== undefined ? zoneName : existingBinLocation.zoneName,
      binNumber:
        binNumber !== undefined ? binNumber : existingBinLocation.binNumber,
      zoned: zoned !== undefined ? zoned : existingBinLocation.zoned,
      zoneType:
        zoneType !== undefined ? zoneType : existingBinLocation.zoneType,
      binType: binType !== undefined ? binType : existingBinLocation.binType,
      binHeight:
        binHeight !== undefined
          ? parseFloat(binHeight)
          : existingBinLocation.binHeight,
      binRow: binRow !== undefined ? binRow : existingBinLocation.binRow,
      binWidth:
        binWidth !== undefined
          ? parseFloat(binWidth)
          : existingBinLocation.binWidth,
      binTotalSize:
        binTotalSize !== undefined
          ? parseFloat(binTotalSize)
          : existingBinLocation.binTotalSize,
      gln: gln !== undefined ? gln : existingBinLocation.gln,
      longitude:
        longitude !== undefined
          ? parseFloat(longitude)
          : existingBinLocation.longitude,
      latitude:
        latitude !== undefined
          ? parseFloat(latitude)
          : existingBinLocation.latitude,
      sgln: sgln !== undefined ? sgln : existingBinLocation.sgln,
      mapLocation:
        mapLocation !== undefined
          ? mapLocation
          : existingBinLocation.mapLocation,
      minQuantity:
        minQuantity !== undefined
          ? parseInt(minQuantity, 10)
          : existingBinLocation.minQuantity,
      availableQty:
        availableQty !== undefined
          ? parseInt(availableQty, 10)
          : existingBinLocation.availableQty,
      maxQuantity:
        maxQuantity !== undefined
          ? parseInt(maxQuantity, 10)
          : existingBinLocation.maxQuantity,
      capacityUsage:
        capacityUsage !== undefined
          ? parseFloat(capacityUsage)
          : existingBinLocation.capacityUsage,
    };

    const updatedBinLocation = await BinLocationModel.update(id, updatedData);

    if (!updatedBinLocation) {
      const error = new CustomError("Couldn't update bin location");
      error.statusCode = 500;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Bin location updated successfully",
          updatedBinLocation
        )
      );
  } catch (error) {
    next(error);
  }
};

// Delete bin location
exports.deleteBinLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const binLocation = await BinLocationModel.findById(id);

    if (!binLocation) {
      const error = new CustomError("Bin location not found");
      error.statusCode = 404;
      throw error;
    }

    const deletedBinLocation = await BinLocationModel.delete(id);

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Bin location deleted successfully",
          deletedBinLocation
        )
      );
  } catch (error) {
    next(error);
  }
};

// Delete multiple bin locations
exports.deleteMultipleBinLocations = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const error = new CustomError(
        "IDs array is required and cannot be empty"
      );
      error.statusCode = 400;
      throw error;
    }

    const result = await BinLocationModel.deleteMany(ids);

    if (!result || result.count === 0) {
      const error = new CustomError(
        "No bin locations were deleted. Please check if the provided IDs exist."
      );
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          `${result.count} bin location(s) deleted successfully`,
          { deletedCount: result.count }
        )
      );
  } catch (error) {
    next(error);
  }
};
