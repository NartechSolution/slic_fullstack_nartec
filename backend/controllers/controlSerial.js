const { validationResult } = require("express-validator");

const ControlSerialModel = require("../models/controlSerial");
const ItemCodeModel = require("../models/tblItemCodes1S1Br");
const SupplierModel = require("../models/supplier");
const BinLocationModel = require("../models/binLocation");
const { sendControlSerialNotificationEmail } = require("../utils/emailManager");
const generateResponse = require("../utils/response");
const CustomError = require("../exceptions/customError");

/**
 * Generate serial number using formula: ItemCode + 6-digit series number
 * @param {string} itemCode - Item ItemCode
 * @param {string} seriesNumber - 6-digit series number
 * @returns {string} - Generated serial number
 */
function generateSerialNumber(itemCode, seriesNumber) {
  return `${itemCode}${seriesNumber}`;
}

exports.createControlSerials = async (req, res, next) => {
  try {
    const { ItemCode, supplierId, poNumber, sizeQuantities } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    // Verify supplier exists
    const supplier = await SupplierModel.getSupplierById(supplierId);
    if (!supplier) {
      const error = new CustomError("Supplier not found");
      error.statusCode = 404;
      throw error;
    }

    // Verify products exist for each size and collect product info
    const productsMap = new Map();
    for (const item of sizeQuantities) {
      const product = await ItemCodeModel.findByItemCodeAndSize(ItemCode, item.size);
      if (!product) {
        const error = new CustomError(
          `Product with ItemCode "${ItemCode}" and size "${item.size}" not found`
        );
        error.statusCode = 404;
        throw error;
      }
      productsMap.set(item.size, product);
    }

    // Generate bulk serials for all sizes
    const serials = [];
    let totalQty = 0;

    for (const item of sizeQuantities) {
      const product = productsMap.get(item.size);
      const qty = item.qty;
      totalQty += qty;

      // Get the starting series number for this product
      let currentSeriesNumber = await ControlSerialModel.getNextSeriesNumber(
        product.id
      );

      for (let i = 0; i < qty; i++) {
        // Generate serial number using the actual ItemCode string + series number
        const serialNumber = generateSerialNumber(ItemCode, currentSeriesNumber);

        serials.push({
          serialNumber,
          ItemCode: product.id, // Use the product's id (foreign key reference)
          supplierId: supplierId,
          poNumber: poNumber,
          size: item.size,
        });

        // Increment series number for next iteration
        const nextNum = parseInt(currentSeriesNumber) + 1;
        if (nextNum > 999999) {
          throw new Error("Series number exceeds maximum value (999999)");
        }
        currentSeriesNumber = nextNum.toString().padStart(6, "0");
      }
    }

    // Create all serials
    const result = await ControlSerialModel.createBulk(serials);

    if (!result || result.count === 0) {
      const error = new CustomError("Failed to create control serials");
      error.statusCode = 500;
      throw error;
    }

    // Fetch created records with product details
    const createdSerials = await Promise.all(
      serials.map((serial) =>
        ControlSerialModel.findBySerialNumber(serial.serialNumber)
      )
    );

    // // Send email notification to supplier
    // try {
    //   const emailResult = await sendControlSerialNotificationEmail({
    //     supplierEmail: supplier.email,
    //     supplierName: supplier.name,
    //     poNumber: poNumber,
    //     itemCode: ItemCode,
    //     quantity: totalQty,
    //     size: sizeQuantities.map(s => s.size).join(", "),
    //   });
    //   console.log("Email notification result:", emailResult);
    // } catch (emailError) {
    //   console.error("Error sending email notification:", emailError);
    //   // Don't fail the operation if email sending fails
    // }

    res
      .status(201)
      .json(
        generateResponse(
          201,
          true,
          `${totalQty} control serial(s) created successfully`,
          createdSerials
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Retrieve all control serials with pagination
 */
exports.getControlSerials = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || null;
    const poNumber = req.query.poNumber || null;
    const itemCode = req.query.itemCode || null;
    const supplierId = req.query.supplierId || null;
    const size = req.query.size || null;

    // Convert isArchived string to boolean: 'true' -> true, anything else (null, 'false', undefined) -> false
    let isArchived = null;
    if (req.query.isArchived === "true") {
      isArchived = true;
    } else if (
      req.query.isArchived !== undefined &&
      req.query.isArchived !== null
    ) {
      isArchived = false;
    }

    const result = await ControlSerialModel.findAllWithPagination(
      page,
      limit,
      search,
      poNumber,
      itemCode,
      supplierId,
      isArchived,
      size
    );
    const { controlSerials, pagination } = result;

    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError("No control serials found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json(
      generateResponse(200, true, "Control serials retrieved successfully", {
        controlSerials,
        pagination,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Retrieve all control serials without pagination
 */
exports.getAllControlSerials = async (req, res, next) => {
  try {
    const result = await ControlSerialModel.findAll();

    if (!result || result.length === 0) {
      const error = new CustomError("No control serials found");
      error.statusCode = 404;
      return next(error);
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Control serials retrieved successfully",
          result
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Retrieve control serial by ID
 */
exports.getControlSerialById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const controlSerial = await ControlSerialModel.findById(id);

    if (!controlSerial) {
      const error = new CustomError("Control serial not found");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Control serial retrieved successfully",
          controlSerial
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Search control serials by ItemCode
 */
exports.searchByItemCode = async (req, res, next) => {
  try {
    const { ItemCode } = req.query;

    if (!ItemCode) {
      const error = new CustomError("ItemCode query parameter is required");
      error.statusCode = 400;
      throw error;
    }

    const controlSerials = await ControlSerialModel.findByItemCode(ItemCode);

    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError(
        "No control serials found for the given ItemCode"
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
          "Control serials retrieved successfully",
          controlSerials
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * POST - Send control serial notification emails by PO number
 * Body: { poNumber: string }
 * This will find all control serials for the PO number (all sizes) which are not yet sent,
 * group them by supplier, send notification email for each supplier,
 * and mark those control serials as isSentToSupplier = true when email sending succeeds.
 */
exports.sendControlSerialsByPoNumber = async (req, res, next) => {
  try {
    const { poNumber } = req.body;

    if (!poNumber) {
      const error = new CustomError("PO number is required");
      error.statusCode = 400;
      throw error;
    }

    // Find all control serials for this PO number (all sizes, not archived)
    const allSerials = await ControlSerialModel.findByPoNumber(
      poNumber,
      false,
      null // null size to get all sizes
    );
    const unsent = (allSerials || []).filter((s) => !s.isSentToSupplier);

    if (!unsent || unsent.length === 0) {
      const error = new CustomError(
        "Already sent all control serials to suppliers for the given PO number"
      );
      error.statusCode = 404;
      throw error;
    }

    // Group by supplierId only (send all sizes together)
    const groups = {};
    for (const s of unsent) {
      const key = s.supplierId;
      if (!groups[key]) {
        groups[key] = {
          supplierId: s.supplierId,
          supplier: s.supplier,
          poNumber: s.poNumber,
          serials: [],
          sizes: new Set(),
        };
      }
      groups[key].serials.push(s);
      if (s.size) {
        groups[key].sizes.add(s.size);
      }
    }

    const sentSummary = [];
    const failedSummary = [];

    // Iterate groups and send emails
    for (const key of Object.keys(groups)) {
      const group = groups[key];
      const supplier = group.supplier;

      try {
        // Get base URL from environment variable
        const baseUrl = process.env.FRONTEND_URL;

        // Collect unique item codes and sizes
        const uniqueItemCodes = [...new Set(group.serials.map((s) => s.product?.ItemCode).filter(Boolean))];
        const allSizes = [...group.sizes].sort().join(", ") || null;

        // Send email notification
        const emailResult = await sendControlSerialNotificationEmail({
          supplierEmail: supplier.email,
          supplierName: supplier.name,
          poNumber: group.poNumber,
          itemCode: uniqueItemCodes.join(", "),
          quantity: group.serials.length,
          size: allSizes,
          baseUrl: baseUrl,
        });

        // Mark all serials in this group as sent
        const serialIds = group.serials.map((s) => s.id);
        await ControlSerialModel.markAsSentByIds(serialIds);

        sentSummary.push({
          supplierId: supplier.id,
          supplierEmail: supplier.email,
          poNumber: group.poNumber,
          quantity: group.serials.length,
          sizes: allSizes,
        });
      } catch (groupError) {
        console.error(`Error sending email for group ${key}:`, groupError);
        failedSummary.push({
          supplierId: supplier.id,
          supplierEmail: supplier.email,
          poNumber: group.poNumber,
          quantity: group.serials.length,
          error: groupError.message,
        });
      }
    }

    res.status(200).json(
      generateResponse(200, true, "Send-by-PO process completed", {
        sent: sentSummary,
        failed: failedSummary,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Search control serial by serial number
 */
exports.searchBySerialNumber = async (req, res, next) => {
  try {
    const { serialNumber } = req.query;

    if (!serialNumber) {
      const error = new CustomError("serialNumber query parameter is required");
      error.statusCode = 400;
      throw error;
    }

    const controlSerial = await ControlSerialModel.findBySerialNumber(
      serialNumber
    );

    if (!controlSerial) {
      const error = new CustomError(
        "No control serial found with the given serial number"
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
          "Control serial retrieved successfully",
          controlSerial
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Search control serials by PO number
 */
exports.searchByPoNumber = async (req, res, next) => {
  try {
    const { poNumber, size } = req.query;

    if (!poNumber) {
      const error = new CustomError("poNumber query parameter is required");
      error.statusCode = 400;
      throw error;
    }

    const controlSerials = await ControlSerialModel.findByPoNumber(
      poNumber,
      false,
      size
    );

    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError(
        "No control serials found for the given PO number"
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
          "Control serials retrieved successfully",
          controlSerials
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT - Update control serial
 */
exports.updateControlSerial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ItemCode, size, poNumber, supplierId, binLocationId, isSentToSupplier, isArchived } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    // Check if control serial exists
    const existingSerial = await ControlSerialModel.findById(id);
    if (!existingSerial) {
      const error = new CustomError("Control serial not found");
      error.statusCode = 404;
      throw error;
    }

    // Build update data object
    const updateData = {};

    // If ItemCode is being updated, verify the product exists
    if (ItemCode && ItemCode !== existingSerial.product?.ItemCode) {
      const product = await ItemCodeModel.findByItemCode(ItemCode);
      if (!product) {
        const error = new CustomError("Product with given ItemCode not found");
        error.statusCode = 404;
        throw error;
      }
      updateData.ItemCode = product.id; // Use the product's id (foreign key reference)
    }

    // If supplierId is being updated, verify the supplier exists
    if (supplierId && supplierId !== existingSerial.supplierId) {
      const supplier = await SupplierModel.getSupplierById(supplierId);
      if (!supplier) {
        const error = new CustomError("Supplier not found");
        error.statusCode = 404;
        throw error;
      }
      updateData.supplierId = supplierId;
    }

    // If binLocationId is being updated, verify the bin location exists
    if (binLocationId !== undefined) {
      if (binLocationId === null) {
        // Allow unsetting the bin location
        updateData.binLocationId = null;
      } else if (binLocationId !== existingSerial.binLocationId) {
        const binLocation = await BinLocationModel.findById(binLocationId);
        if (!binLocation) {
          const error = new CustomError("Bin Location not found");
          error.statusCode = 404;
          throw error;
        }
        updateData.binLocationId = binLocationId;
      }
    }

    // Add other optional fields if provided
    if (size !== undefined) {
      updateData.size = size;
    }
    if (poNumber !== undefined) {
      updateData.poNumber = poNumber;
    }
    if (isSentToSupplier !== undefined) {
      updateData.isSentToSupplier = isSentToSupplier;
    }
    if (isArchived !== undefined) {
      updateData.isArchived = isArchived;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res
        .status(200)
        .json(
          generateResponse(
            200,
            true,
            "Control serial is already up to date",
            existingSerial
          )
        );
    }

    const updatedSerial = await ControlSerialModel.update(id, updateData);

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Control serial updated successfully",
          updatedSerial
        )
      );
  } catch (error) {
    next(error);
  }
};


exports.updateSizeByPO = async (req, res, next) => {
  try {
    const { poNumber, oldSize, newSize } = req.body;

    // express-validator result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new CustomError(errors.errors[0].msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    if (oldSize === newSize) {
      return res.status(200).json(
        generateResponse(
          200,
          true,
          "Old size and new size are the same. No update required.",
          null
        )
      );
    }

    // 🔑 Use existing model method
    const result = await ControlSerialModel.updateByPoNumberAndSize(
      poNumber,
      oldSize,
      {
        size: newSize
      }
    );

    if (result.count === 0) {
      const error = new CustomError(
        "No control serials found for given PO number and old size"
      );
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json(
      generateResponse(
        200,
        true,
        `Size updated successfully for ${result.count} record(s)`,
        {
          poNumber,
          oldSize,
          newSize,
          updatedCount: result.count
        }
      )
    );
  } catch (error) {
    next(error);
  }
};



/**
 * PUT - Update control serials by PO number and size
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.putAway = async (req, res, next) => {
  try {
    const { poNumber, size, binLocationId } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    // Check if any control serials exist for this PO number and size
    const existingSerials = await ControlSerialModel.findByPoNumber(
      poNumber,
      true,
      size,
      false
    );
    if (!existingSerials || existingSerials.length === 0) {
      const error = new CustomError(
        "No control serials found for the given PO number and size"
      );
      error.statusCode = 404;
      throw error;
    }

    // Build update data object
    const updateData = {};

    // If binLocationId is being updated, verify the bin location exists
    if (binLocationId !== undefined) {
      if (binLocationId === null) {
        // Allow unsetting the bin location
        updateData.binLocationId = null;
      } else {
        const binLocation = await BinLocationModel.findById(binLocationId);
        if (!binLocation) {
          const error = new CustomError("Bin Location not found");
          error.statusCode = 404;
          throw error;
        }
        updateData.binLocationId = binLocationId;
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      const error = new CustomError("No update data provided");
      error.statusCode = 400;
      throw error;
    }

    const result = await ControlSerialModel.updateByPoNumberAndSize(
      poNumber,
      size,
      updateData
    );

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          `${result.count} control serial(s) updated successfully`,
          result
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE - Delete control serial
 */
exports.deleteControlSerial = async (req, res, next) => {
  try {
    const { id } = req.params;

    const controlSerial = await ControlSerialModel.findById(id);
    if (!controlSerial) {
      const error = new CustomError("Control serial not found");
      error.statusCode = 404;
      throw error;
    }

    const deletedSerial = await ControlSerialModel.deleteById(id);

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Control serial deleted successfully",
          deletedSerial
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Get PO numbers with supplier details for authenticated supplier
 * Used by supplier portal with supplier bearer token
 */
exports.getSupplierPoNumbersWithSupplierDetails = async (req, res, next) => {
  try {
    // Get supplier ID from the authenticated request (set by is-supplier-auth middleware)
    const supplierEmail = req?.email;

    if (!supplierEmail) {
      const error = new CustomError("Supplier email not found in token");
      error.statusCode = 401;
      throw error;
    }

    // Verify supplier exists
    const supplier = await SupplierModel.getSupplierByEmail(supplierEmail);
    if (!supplier) {
      const error = new CustomError("Supplier not found");
      error.statusCode = 404;
      throw error;
    }

    // Get unique PO numbers with supplier details
    const poNumbersWithSupplier =
      await ControlSerialModel.getPoNumbersWithSupplierDetailsBySupplierId(
        supplier.id
      );

    // Get total count of control serials for each PO number
    const poNumbersWithCount = await Promise.all(
      poNumbersWithSupplier.map(async (po) => {
        const count = await ControlSerialModel.countByPoNumber(po.poNumber);
        return {
          ...po,
          totalCount: count,
        };
      })
    );

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "PO numbers with supplier details retrieved successfully",
          poNumbersWithCount
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Get PO numbers with supplier details for authenticated SLIC admin
 * Used by SLIC project
 */
exports.getPoNumbersWithSupplierDetails = async (req, res, next) => {
  try {
    const itemCode = req.query.itemCode || null;
    const size = req.query.size || null;
    const isArchived =
      req.query.isArchived !== undefined
        ? req.query.isArchived === "true"
        : null;
    const hasPutAway =
      req.query.hasPutAway !== undefined
        ? req.query.hasPutAway === "true"
        : null;

    // Get unique PO numbers with supplier details
    const poNumbersWithSupplier =
      await ControlSerialModel.getPoNumbersWithSupplierDetails(
        itemCode,
        size,
        isArchived,
        hasPutAway,
      );
    // Get total count of control serials for each PO number
    const poNumbersWithCount = await Promise.all(
      poNumbersWithSupplier.map(async (po) => {
        const count = await ControlSerialModel.countByPoNumber(
          po.poNumber,
          size
        );
        return {
          ...po,
          totalCount: count,
        };
      })
    );

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "PO numbers with supplier details retrieved successfully",
          poNumbersWithCount
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * POST - Archive all control serials by PO number
 * Body: { poNumber: string }
 */
exports.archiveControlSerialsByPoNumber = async (req, res, next) => {
  try {
    const { poNumber, size } = req.body;

    if (!poNumber) {
      const error = new CustomError("PO number is required");
      error.statusCode = 400;
      throw error;
    }

    if (!size) {
      const error = new CustomError("Size is required");
      error.statusCode = 400;
      throw error;
    }

    // Check if any control serials exist for this PO number
    const controlSerials = await ControlSerialModel.findByPoNumber(
      poNumber,
      false,
      size
    );
    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError(
        "No control serials found for the given PO number"
      );
      error.statusCode = 404;
      throw error;
    }

    // Archive all control serials for this PO number
    const result = await ControlSerialModel.archiveByPoNumber(poNumber, size);

    if (result.count === 0) {
      const error = new CustomError("Failed to archive control serials");
      error.statusCode = 500;
      throw error;
    }

    res.status(200).json(
      generateResponse(
        200,
        true,
        `${result.count} control serial(s) archived successfully for PO number: ${poNumber}`,
        {
          poNumber,
          archivedCount: result.count,
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST - Unarchive all control serials by PO number
 * Body: { poNumber: string }
 */
exports.unarchiveControlSerialsByPoNumber = async (req, res, next) => {
  try {
    const { poNumber, size } = req.body;

    if (!poNumber) {
      const error = new CustomError("PO number is required");
      error.statusCode = 400;
      throw error;
    }

    if (!size) {
      const error = new CustomError("Size is required");
      error.statusCode = 400;
      throw error;
    }

    // Check if any archived control serials exist for this PO number
    const controlSerials = await ControlSerialModel.findByPoNumber(
      poNumber,
      false,
      size
    );
    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError(
        "No control serials found for the given PO number"
      );
      error.statusCode = 404;
      throw error;
    }

    const archivedSerials = controlSerials.filter((s) => s.isArchived);
    if (archivedSerials.length === 0) {
      const error = new CustomError(
        "No archived control serials found for the given PO number"
      );
      error.statusCode = 404;
      throw error;
    }

    // Unarchive all control serials for this PO number
    const result = await ControlSerialModel.unarchiveByPoNumber(poNumber, size);

    if (result.count === 0) {
      const error = new CustomError("Failed to unarchive control serials");
      error.statusCode = 500;
      throw error;
    }

    res.status(200).json(
      generateResponse(
        200,
        true,
        `${result.count} control serial(s) unarchived successfully for PO number: ${poNumber}`,
        {
          poNumber,
          unarchivedCount: result.count,
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Get unique PO numbers with combined total qty across all sizes
 * Returns: poNumber, serialNumber (sample), ItemCode, product, totalQty, isSentToSupplier
 * Optimized: Single query approach with aggregations
 */
exports.getUniquePONumbersWithTotalQty = async (req, res, next) => {
  try {
    const isArchived =
      req.query.isArchived !== undefined
        ? req.query.isArchived === "true"
        : null;

    // Get unique PO numbers with totalQty and isSentToSupplier (optimized single query)
    const posWithDetails = await ControlSerialModel.getUniquePONumbersWithTotalQty(
      isArchived
    );

    if (!posWithDetails || posWithDetails.length === 0) {
      const error = new CustomError("No PO numbers found");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Unique PO numbers with total quantities retrieved successfully",
          posWithDetails
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * GET - Get all control serial details for a specific PO number grouped by size
 * Query: ?poNumber=value
 * Returns: All records for the PO number with size summary
 */
exports.getControlSerialDetailsByPONumber = async (req, res, next) => {
  try {
    const { poNumber } = req.query;

    if (!poNumber) {
      const error = new CustomError("poNumber query parameter is required");
      error.statusCode = 400;
      throw error;
    }

    // Get size summary (unique sizes with counts)
    const sizeSummary = await ControlSerialModel.getSizeSummaryByPoNumber(
      poNumber
    );

    if (!sizeSummary || sizeSummary.length === 0) {
      const error = new CustomError(
        "No control serials found for the given PO number"
      );
      error.statusCode = 404;
      throw error;
    }

    // Get all records grouped by size
    const allRecords =
      await ControlSerialModel.getControlSerialsByPONumberGroupedBySize(
        poNumber
      );

    // Calculate total qty
    const totalQty = sizeSummary.reduce((sum, item) => sum + item.qty, 0);

    res.status(200).json(
      generateResponse(
        200,
        true,
        "Control serial details retrieved successfully",
        {
          poNumber,
          totalQty,
          sizeSummary,
          records: allRecords,
        }
      )
    );
  } catch (error) {
    next(error);
  }
};
