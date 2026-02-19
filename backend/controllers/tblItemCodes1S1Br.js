const mod10CheckDigit = require("mod10-check-digit");
const { validationResult } = require("express-validator");
const XLSX = require("xlsx");

const ItemCodeModel = require("../models/tblItemCodes1S1Br");
const BarSeriesNo = require("../models/barSeriesNo");
const generateResponse = require("../utils/response");
const CustomError = require("../exceptions/customError");
const { deleteFile } = require("../utils/file");
const prisma = require("../db");

function calculateCheckDigit(gtinWithoutCheckDigit) {
  const digits = gtinWithoutCheckDigit.split("").map(Number);
  let sum = 0;

  // EAN-13 check digit calculation (modulo-10 algorithm)
  for (let i = 0; i < digits.length; i++) {
    sum += i % 2 === 0 ? digits[i] * 1 : digits[i] * 3;
  }

  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return checkDigit.toString();
}

async function generateBarcode(id) {
  const GCP = "6287898";
  const seriesNo = await BarSeriesNo.getBarSeriesNo(id);

  if (!seriesNo) {
    throw new CustomError("BarSeriesNo not found", 404);
  }

  // Construct the base barcode
  const baseBarcode = `${GCP}${seriesNo.BarSeriesNo}`;

  // Add a leading zero if the base barcode length is 11
  let barcode;
  if (baseBarcode.length === 11) {
    barcode = `${GCP}0${seriesNo.BarSeriesNo}`;
  } else if (baseBarcode.length === 12) {
    barcode = baseBarcode;
  } else {
    throw new CustomError("BarSeriesNo is not in a valid format", 400);
  }

  // Calculate the check digit and append it
  const CHECK_DIGIT = calculateCheckDigit(barcode);
  barcode += CHECK_DIGIT;

  if (barcode.length !== 13) {
    throw new CustomError("Generated barcode is not 13 characters long", 500);
  }

  // Increment the BarSeriesNo for the next generation
  const number = (Number(seriesNo.BarSeriesNo) + 1).toString();
  const result = await BarSeriesNo.updateBarSeriesNo(id, number);

  if (!result) {
    throw new CustomError("Failed to update BarSeriesNo", 500);
  }

  return barcode;
}
exports.getItemCodes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || null;

    const result = await ItemCodeModel.findAllWithPagination(
      page,
      limit,
      search
    );
    const { itemCodes, pagination } = result;

    if (!itemCodes || itemCodes.length <= 0) {
      const error = new CustomError("No item codes found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json(
      generateResponse(200, true, "Item codes retrieved successfully", {
        itemCodes,
        pagination,
      })
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllItemCodes = async (req, res, next) => {
  try {
    const result = await ItemCodeModel.findAll();

    if (!result || result.length <= 0) {
      const error = new CustomError("No item codes found");
      error.statusCode = 404;
      return next(error);
    }

    res
      .status(200)
      .json(
        generateResponse(200, true, "Item codes retrieved successfully", result)
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

/**
 * GET - Search item codes by ItemCode field
 * Returns top 20 matching records
 * Query: ?search=value
 */
exports.searchItemCodes = async (req, res, next) => {
  try {
    const { search } = req.query;

    if (!search || search.trim().length === 0) {
      const error = new CustomError("Search query parameter is required");
      error.statusCode = 400;
      return next(error);
    }

    const results = await ItemCodeModel.searchByItemCode(search.trim());

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          `Found ${results.length} matching item codes`,
          results
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

// exports.updateGTINs = async (req, res, next) => {
//   try {
//     // Fetch all item codes
//     const itemCodes = await ItemCodeModel.findAll();

//     // Update each item code with the correct check digit
//     const updatePromises = itemCodes.map(async (item) => {
//       if (item.GTIN && item.GTIN.length === 13) {
//         const gtinWithoutCheckDigit = item.GTIN.slice(0, 12);
//         const correctCheckDigit = calculateCheckDigit(gtinWithoutCheckDigit);
//         const updatedGTIN = `${gtinWithoutCheckDigit}${correctCheckDigit}`;

//         // Update the record only if it needs correction
//         if (updatedGTIN !== item.GTIN) {
//           return await ItemCodeModel.update(item.id, { GTIN: updatedGTIN });
//         }
//       }
//     });

//     await Promise.all(updatePromises);

//     res.status(200).json({ message: "GTINs updated successfully" });
//   } catch (error) {
//     next(error);
//   }
// };

exports.postItemCode = async (req, res, next) => {
  try {
    const { itemCode, quantity, description, startSize, endSize } = req.body;

    const barcode = await generateBarcode(1);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    // // Convert date fields to ISO-8601 strings
    // if (body.ExpiryDate) {
    //   body.ExpiryDate = new Date(body.ExpiryDate).toISOString();
    // }
    // if (body.ProductionDate) {
    //   body.ProductionDate = new Date(body.ProductionDate).toISOString();
    // }

    // const _itemCode = await ItemCodeModel.create(req.body);

    const body = {
      GTIN: barcode,
      ItemCode: itemCode,
      ItemQty: Number(quantity),
      EnglishName: description,
      ArabicName: description,
      QRCodeInternational: barcode,
      ProductSize: startSize,
    };
    const _itemCode = await ItemCodeModel.create(body);

    res
      .status(201)
      .json(
        generateResponse(201, true, "Item code created successfully", _itemCode)
      );
  } catch (error) {
    next(error);
  }
};

exports.postItemCodeV2 = async (req, res, next) => {
  let imagePath = null;
  try {
    const {
      itemCode,
      quantity,
      description,
      startSize,
      endSize,
      upper,
      sole,
      width,
      color,
      label,
    } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const numRecords = endSize - startSize + 1;
    let recordsCreated = [];

    for (let size = startSize; size <= endSize; size++) {
      const barcode = await generateBarcode(1);
      const body = {
        GTIN: barcode,
        ItemCode: itemCode,
        ItemQty: 1,
        EnglishName: description,
        ArabicName: description,
        QRCodeInternational: barcode,
        ProductSize: size.toString(),
        upper: upper,
        sole: sole,
        width: width,
        color: color,
        label: label,
      };

      if (req.file) {
        imagePath = req.file.path; // Store the path of the uploaded image
        body.image = imagePath; // Add the image path to the body
      }

      const _itemCode = await ItemCodeModel.create(body);
      recordsCreated.push(_itemCode);
    }

    res
      .status(201)
      .json(
        generateResponse(
          201,
          true,
          "Item codes created successfully",
          recordsCreated
        )
      );
  } catch (error) {
    if (imagePath) {
      await deleteFile(imagePath);
    }
    next(error);
  }
};

exports.putItemCode = async (req, res, next) => {
  let imagePath = null;
  try {
    const GTIN = req.params.GTIN;

    const existingItemCode = await ItemCodeModel.findById(GTIN);

    if (!existingItemCode) {
      const error = new CustomError("Item code not found");
      error.statusCode = 404;
      throw error;
    }

    const {
      itemCode,
      quantity,
      description,
      startSize,
      ArabicName,
      endSize,
      upper,
      sole,
      width,
      color,
      label,
    } = req.body;

    // Prepare the updated data
    const updatedData = {
      ItemCode: itemCode || existingItemCode.ItemCode,
      ItemQty:
        quantity !== undefined ? Number(quantity) : existingItemCode.ItemQty,
      EnglishName: description || existingItemCode.EnglishName,
      ArabicName: ArabicName || existingItemCode.ArabicName,
      ProductSize: startSize || existingItemCode.ProductSize,
      upper: upper !== undefined ? upper : existingItemCode.upper,
      sole: sole !== undefined ? sole : existingItemCode.sole,
      width: width !== undefined ? width : existingItemCode.width,
      color: color !== undefined ? color : existingItemCode.color,
      label: label !== undefined ? label : existingItemCode.label,
    };

    if (req.file) {
      imagePath = req.file.path; // Store the path of the uploaded image
      updatedData.image = imagePath; // Add the new image path to the updated data
      // delete old image if exists
      if (existingItemCode.image) {
        await deleteFile(existingItemCode.image);
      }
    }

    // Save the updated item code data
    const updatedItemCode = await ItemCodeModel.update(
      existingItemCode.id,
      updatedData
    );

    if (!updatedItemCode) {
      const error = new CustomError(`Couldn't update item code`);
      error.statusCode = 500;
      throw error;
    }

    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Item code updated successfully",
          updatedItemCode
        )
      );
  } catch (error) {
    if (imagePath) {
      await deleteFile(imagePath);
    }
    next(error);
  }
};

exports.deleteItemCode = async (req, res, next) => {
  try {
    const GTIN = req.params.GTIN;
    const itemCode = await ItemCodeModel.findById(GTIN);
    if (!itemCode) {
      const error = new CustomError("Item code not found");
      error.statusCode = 404;
      throw error;
    }
    // Delete the item code
    const deletedItemCode = await ItemCodeModel.deleteById(itemCode.id);
    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Item code deleted successfully",
          deletedItemCode
        )
      );
  } catch (error) {
    next(error);
  }
};

exports.searchByPartialGTIN = async (req, res, next) => {
  try {
    const GTIN = req.query.GTIN;
    const itemCodes = await ItemCodeModel.searchByGtin(GTIN);
    if (!itemCodes || itemCodes.length <= 0) {
      const error = new CustomError("No item codes found with the given GTIN");
      error.statusCode = 404;
      throw error;
    }
    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Item code retrieved successfully",
          itemCodes
        )
      );
  } catch (error) {
    next(error);
  }
};

exports.searchByGTIN = async (req, res, next) => {
  try {
    const GTIN = req.query.GTIN;
    const itemCode = await ItemCodeModel.findById(GTIN);
    if (!itemCode) {
      const error = new CustomError("No item code found with the given GTIN");
      error.statusCode = 404;
      throw error;
    }
    res
      .status(200)
      .json(
        generateResponse(
          200,
          true,
          "Item code retrieved successfully",
          itemCode
        )
      );
  } catch (error) {
    next(error);
  }
};

exports.findByItemCode = async (req, res, next) => {
  try {
    const itemCode = req.query.itemCode;
    const item = await ItemCodeModel.findByItemCode(itemCode);
    if (!item) {
      const error = new CustomError("No item code found");
      error.statusCode = 404;
      throw error;
    }
    res
      .status(200)
      .json(
        generateResponse(200, true, "Item code retrieved successfully", item)
      );
  } catch (error) {
    next(error);
  }
};

exports.putMultipleItemCodes = async (req, res, next) => {
  let imagePath = null;
  try {
    const { itemCode, sizes } = req.body;
    let updateData = {};

    // Parse updateData if it's a string (from form-data)
    if (req.body.updateData) {
      try {
        updateData =
          typeof req.body.updateData === "string"
            ? JSON.parse(req.body.updateData)
            : req.body.updateData;
      } catch (e) {
        const error = new CustomError("Invalid updateData format");
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate that itemCode exists
    if (!itemCode) {
      const error = new CustomError("ItemCode is required");
      error.statusCode = 400;
      throw error;
    }

    // Validate that sizes array exists and is not empty
    let sizesArray = sizes;
    if (typeof sizes === "string") {
      try {
        sizesArray = JSON.parse(sizes);
      } catch (e) {
        const error = new CustomError("Invalid sizes format");
        error.statusCode = 400;
        throw error;
      }
    }

    if (!sizesArray || !Array.isArray(sizesArray) || sizesArray.length === 0) {
      const error = new CustomError(
        "Sizes array is required and cannot be empty"
      );
      error.statusCode = 400;
      throw error;
    }

    // Get existing records before update to handle image deletion
    const existingRecords = await ItemCodeModel.findManyByItemCodeAndSizes(
      itemCode,
      sizesArray
    );

    if (!existingRecords || existingRecords.length === 0) {
      const error = new CustomError(
        "No item codes found with the provided ItemCode and sizes"
      );
      error.statusCode = 404;
      throw error;
    }

    // Prepare the data to be updated (only include fields that are provided)
    const dataToUpdate = {};

    if (updateData.ItemQty !== undefined)
      dataToUpdate.ItemQty = Number(updateData.ItemQty);
    if (updateData.EnglishName !== undefined)
      dataToUpdate.EnglishName = updateData.EnglishName;
    if (updateData.ArabicName !== undefined)
      dataToUpdate.ArabicName = updateData.ArabicName;
    if (updateData.upper !== undefined) dataToUpdate.upper = updateData.upper;
    if (updateData.sole !== undefined) dataToUpdate.sole = updateData.sole;
    if (updateData.width !== undefined) dataToUpdate.width = updateData.width;
    if (updateData.color !== undefined) dataToUpdate.color = updateData.color;
    if (updateData.label !== undefined) dataToUpdate.label = updateData.label;

    // Handle image upload - applies to all selected products
    if (req.file) {
      imagePath = req.file.path;
      dataToUpdate.image = imagePath;

      // Delete old images from all affected records
      for (const record of existingRecords) {
        if (record.image) {
          await deleteFile(record.image);
        }
      }
    }

    // Validate that there's something to update
    if (Object.keys(dataToUpdate).length === 0) {
      const error = new CustomError("Update data is required");
      error.statusCode = 400;
      throw error;
    }

    // Perform bulk update
    const result = await ItemCodeModel.updateManyByItemCodeAndSizes(
      itemCode,
      sizesArray,
      dataToUpdate
    );

    if (!result || result.count === 0) {
      const error = new CustomError(
        "No item codes were updated. Please check if the provided ItemCode and sizes exist."
      );
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(
      generateResponse(
        200,
        true,
        `${result.count} item code(s) updated successfully`,
        {
          updatedCount: result.count,
          itemCode,
          sizes: sizesArray,
          imageUpdated: !!req.file,
        }
      )
    );
  } catch (error) {
    // Clean up uploaded image if there was an error
    if (imagePath) {
      await deleteFile(imagePath);
    }
    next(error);
  }
};

exports.bulkImportFromExcel = async (req, res, next) => {
  let filePath = null;
  try {
    // Check if file is uploaded
    if (!req.file) {
      const error = new CustomError("Excel/CSV file is required");
      error.statusCode = 400;
      throw error;
    }

    filePath = req.file.path;

    // Read the Excel/CSV file
    const workbook = XLSX.readFile(filePath);

    const results = {
      success: [],
      failed: [],
      total: 0,
      created: 0,
      updated: 0,
      sheetsProcessed: 0,
    };

    const BATCH_SIZE = 2000; // Process 2000 records at a time for better performance (optimized for 100k+ records)

    // Process all sheets in the workbook (skip first sheet if it's metadata)
    for (let sheetIndex = 0; sheetIndex < workbook.SheetNames.length; sheetIndex++) {
      const sheetName = workbook.SheetNames[sheetIndex];

      // Skip first sheet if it's named "PRODUCTION DATE" or similar metadata sheets
      if (sheetIndex === 0 && (
        sheetName.toLowerCase().includes('production date') ||
        sheetName.toLowerCase().includes('metadata') ||
        sheetName.toLowerCase().includes('summary')
      )) {
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        continue; // Skip empty sheets
      }

      results.total += jsonData.length;
      results.sheetsProcessed++;

      // Helper function to get value from row with multiple possible column names
      const getValue = (row, possibleNames, convertToString = false) => {
        for (const name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            const value = row[name];
            // Convert to string if requested and value is not null/undefined
            if (convertToString && value !== null && value !== undefined) {
              return String(value).trim();
            }
            return value;
          }
        }
        return null;
      };

      // Parse production date (handle "i-025" format and Excel serial dates)
      const parseProductionDate = (dateValue) => {
        if (!dateValue) return null;

        // If it's already a date object or number (Excel serial date)
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'number') {
          // Excel serial date to JS Date
          return new Date((dateValue - 25569) * 86400 * 1000);
        }

        // If it's a string like "i-025", try to parse it or return null
        if (typeof dateValue === 'string') {
          // Try parsing as ISO date first
          const parsedDate = new Date(dateValue);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }

        return null;
      };

      // Process records in batches
      for (let batchStart = 0; batchStart < jsonData.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, jsonData.length);
        const batchData = jsonData.slice(batchStart, batchEnd);

        const validRecords = [];
        const invalidRecords = [];

        // Validate and prepare batch data
        for (let i = 0; i < batchData.length; i++) {
          try {
            const row = batchData[i];
            const actualRowIndex = batchStart + i;

            // Prepare data for insertion with flexible column mapping
            // Handle CODE + STYLE combination for ItemCode
            const codeValue = getValue(row, ['CODE', 'Code', 'code'], true);
            const styleValue = getValue(row, ['STYLE', 'Style', 'ItemCode', 'Item Code', 'itemCode', 'item_code'], true);
            let itemCode = styleValue; // Default to STYLE value

            // If both CODE and STYLE exist, combine them
            if (codeValue && styleValue) {
              itemCode = `${codeValue}${styleValue}`;
            } else if (codeValue && !styleValue) {
              // If only CODE exists, use it
              itemCode = codeValue;
            }

            const itemData = {
              ItemCode: itemCode,
              EnglishName: getValue(row, ['EnglishName', 'English Name', 'Name', 'Product Name', 'englishName'], true),
              ArabicName: getValue(row, ['ArabicName', 'Arabic Name', 'arabicName', 'arabic_name'], true),
              GTIN: getValue(row, ['BARCODE', 'Barcode', 'barcode', 'GTIN', 'gtin', 'EAN', 'UPC'], true),
              LotNo: getValue(row, ['LotNo', 'Lot No', 'Lot Number', 'lotNo', 'lot_no'], true),
              ExpiryDate: getValue(row, ['ExpiryDate', 'Expiry Date', 'expiryDate', 'expiry_date'])
                ? parseProductionDate(getValue(row, ['ExpiryDate', 'Expiry Date', 'expiryDate', 'expiry_date']))
                : null,
              sERIALnUMBER: getValue(row, ['sERIALnUMBER', 'SerialNumber', 'Serial Number', 'Serial Num', 'Serial', 'serialNumber', 'serial_number'], true),
              ItemQty: getValue(row, ['ItemQty', 'Item Qty', 'Quantity', 'Qty', 'itemQty', 'quantity'])
                ? parseInt(getValue(row, ['ItemQty', 'Item Qty', 'Quantity', 'Qty', 'itemQty', 'quantity']))
                : 0,
              WHLocation: getValue(row, ['WHLocation', 'WH Location', 'Warehouse Location', 'whLocation', 'wh_location'], true),
              BinLocation: getValue(row, ['BinLocation', 'Bin Location', 'Bin', 'binLocation', 'bin_location'], true),
              QRCodeInternational: (getValue(row, ['QRCodeInternational', 'QR Code', 'QRCode', 'qrCode', 'qr_code'], true)
                || getValue(row, ['BARCODE', 'Barcode', 'barcode', 'GTIN', 'gtin'], true)),
              ModelName: getValue(row, ['STEEL MID', 'Steel Mid', 'ModelName', 'Model Name', 'Model', 'modelName', 'model_name'], true),
              ProductionDate: parseProductionDate(getValue(row, ['PRO DATE', 'Pro Date', 'ProductionDate', 'Production Date', 'productionDate', 'production_date'])),
              ProductType: getValue(row, ['ProductType', 'Product Type', 'Type', 'productType', 'product_type'], true),
              BrandName: getValue(row, ['BrandName', 'Brand Name', 'Brand', 'brandName', 'brand_name'], true),
              PackagingType: getValue(row, ['PackagingType', 'Packaging Type', 'Packaging', 'packagingType', 'packaging_type'], true),
              ProductUnit: getValue(row, ['ProductUnit', 'Product Unit', 'Unit', 'productUnit', 'product_unit'], true),
              ProductSize: getValue(row, ['SIZE', 'Size', 'ProductSize', 'Product Size', 'productSize', 'product_size'], true),
              image: getValue(row, ['image', 'Image', 'ImagePath', 'image_path'], true),
              upper: getValue(row, ['upper', 'Upper'], true),
              sole: getValue(row, ['sole', 'Sole'], true),
              width: getValue(row, ['WIDTH', 'Width', 'width'], true),
              color: getValue(row, ['COLOR', 'Color', 'Colour', 'colour', 'color'], true),
              label: getValue(row, ['label', 'Label'], true),
            };

            // Remove null/undefined fields to avoid Prisma errors
            Object.keys(itemData).forEach(key => {
              if (itemData[key] === null || itemData[key] === undefined) {
                delete itemData[key];
              }
            });

            validRecords.push({
              data: itemData,
              rowIndex: actualRowIndex,
            });
          } catch (error) {
            const row = batchData[i];
            const actualRowIndex = batchStart + i;

            // Handle CODE + STYLE combination for error reporting
            const codeValue = getValue(row, ['CODE', 'Code', 'code'], true);
            const styleValue = getValue(row, ['STYLE', 'Style', 'ItemCode', 'Item Code', 'itemCode', 'item_code'], true);
            let failedItemCode = styleValue;

            if (codeValue && styleValue) {
              failedItemCode = `${codeValue}${styleValue}`;
            } else if (codeValue && !styleValue) {
              failedItemCode = codeValue;
            }

            invalidRecords.push({
              sheet: sheetName,
              row: actualRowIndex + 2,
              ItemCode: failedItemCode,
              GTIN: getValue(row, ['BARCODE', 'Barcode', 'barcode', 'GTIN', 'gtin'], true),
              error: `Validation error: ${error.message}`,
            });
          }
        }

        // Batch upsert valid records (insert new, update existing)
        if (validRecords.length > 0) {
          try {
            const batchUpsertData = validRecords.map(r => r.data);
            const startTime = Date.now();

            // ... existing code ...
            // Use bulkUpsert for MSSQL compatibility (no skipDuplicates)
            await prisma.tblItemCodes1S1Br.createMany({
              data: batchUpsertData,
              skipDuplicates: true, // This skips duplicates based on unique constraints (ItemCode)
            });

            const endTime = Date.now();
            console.log(`✓ Batch ${Math.floor(batchStart / BATCH_SIZE) + 1} processed in ${(endTime - startTime)}ms: ${validRecords.length} records upserted`);

            results.success.push(...validRecords.map(r => ({
              sheet: sheetName,
              row: r.rowIndex + 2,
              ItemCode: r.data.ItemCode,
              GTIN: r.data.GTIN
            })));

            results.created += validRecords.length; // Approximate (could be updates)
          } catch (error) {
            console.error(`✗ Batch processing failed:`, error);
            // If batch fails, try one by one to save what we can
            // (omitted for brevity, but good practice for robustness)
            results.failed.push({
              sheet: sheetName,
              batch: `${batchStart}-${batchEnd}`,
              error: `Batch error: ${error.message}`
            });
          }
        }

        // Add invalid records to failed list
        results.failed.push(...invalidRecords);
      }
    }

    // Calculate stats
    results.failedCount = results.failed.length;
    results.successCount = results.success.length;

    // Clean up uploaded file
    await deleteFile(filePath);

    res.status(200).json(
      generateResponse(
        200,
        true,
        `Import completed: ${results.successCount} processed, ${results.failedCount} failed`,
        results
      )
    );

  } catch (error) {
    if (filePath) {
      await deleteFile(filePath);
    }
    next(error);
  }
};

exports.downloadAllProducts = async (req, res, next) => {
  try {
    const itemCodes = await ItemCodeModel.findAll();

    if (!itemCodes || itemCodes.length === 0) {
      const error = new CustomError("No products found to download");
      error.statusCode = 404;
      throw error;
    }

    // Map data to match the import template format
    const data = itemCodes.map((item) => ({
      CODE: item.ItemCode, // Assuming ItemCode maps to CODE/STYLE logic, keeping it simple here
      STYLE: '', // Or split ItemCode if needed, but for export usually we just dump the data 
      ItemCode: item.ItemCode,
      EnglishName: item.EnglishName,
      ArabicName: item.ArabicName,
      GTIN: item.GTIN,
      LotNo: item.LotNo,
      ExpiryDate: item.ExpiryDate ? new Date(item.ExpiryDate).toISOString().split('T')[0] : '', // Format YYYY-MM-DD
      SerialNumber: item.sERIALnUMBER,
      ItemQty: item.ItemQty,
      WHLocation: item.WHLocation,
      BinLocation: item.BinLocation,
      QRCodeInternational: item.QRCodeInternational,
      ModelName: item.ModelName,
      ProductionDate: item.ProductionDate ? new Date(item.ProductionDate).toISOString().split('T')[0] : '',
      ProductType: item.ProductType,
      BrandName: item.BrandName,
      PackagingType: item.PackagingType,
      ProductUnit: item.ProductUnit,
      ProductSize: item.ProductSize,
      image: item.image,
      upper: item.upper,
      sole: item.sole,
      width: item.width,
      color: item.color,
      label: item.label,
    }));

    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set headers for download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=All_Products.xlsx"
    );

    // Send the buffer
    res.send(buffer);

  } catch (error) {
    next(error);
  }
};



exports.checkDuplicateGTINs = async (req, res, next) => {
  try {
    console.log("Checking for duplicate GTINs...");
    const startTime = Date.now();

    // Find all duplicate GTINs
    const duplicateGTINs = await ItemCodeModel.findDuplicateGTINs();

    if (!duplicateGTINs || duplicateGTINs.length === 0) {
      return res.status(200).json(
        generateResponse(200, true, "No duplicate GTINs found", {
          duplicatesFound: 0,
          totalDuplicateRecords: 0,
          details: [],
        })
      );
    }

    console.log(`Found ${duplicateGTINs.length} duplicate GTINs`);

    let totalDuplicateRecords = 0;
    let recordsToBeRemoved = 0;
    const details = [];

    // Score a record based on how many fields are filled
    const scoreRecord = (record) => {
      let score = 0;
      const fieldsToCheck = [
        'ItemCode', 'EnglishName', 'ArabicName', 'GTIN', 'LotNo',
        'ExpiryDate', 'sERIALnUMBER', 'ItemQty', 'WHLocation',
        'BinLocation', 'QRCodeInternational', 'ModelName',
        'ProductionDate', 'ProductType', 'BrandName', 'PackagingType',
        'ProductUnit', 'ProductSize', 'image', 'upper', 'sole',
        'width', 'color', 'label'
      ];

      fieldsToCheck.forEach((field) => {
        if (record[field] !== null && record[field] !== undefined && record[field] !== '') {
          score++;
        }
      });

      return score;
    };

    // Process duplicates to analyze them
    const BATCH_SIZE = 100;

    for (let i = 0; i < duplicateGTINs.length; i += BATCH_SIZE) {
      const batch = duplicateGTINs.slice(i, Math.min(i + BATCH_SIZE, duplicateGTINs.length));

      for (const duplicate of batch) {
        const gtin = duplicate.GTIN;
        const count = parseInt(duplicate.count);

        // Get all records with this GTIN
        const records = await ItemCodeModel.findAllByGTIN(gtin);

        if (records.length <= 1) {
          continue;
        }

        totalDuplicateRecords += records.length;

        // Score each record
        const scoredRecords = records.map((record) => ({
          id: record.id,
          score: scoreRecord(record),
          createdAt: record.Created_at,
          itemCode: record.ItemCode,
          productSize: record.ProductSize,
          whLocation: record.WHLocation,
          binLocation: record.BinLocation,
        }));

        // Sort by score (highest first), then by Created_at (most recent first)
        scoredRecords.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const recordToKeep = scoredRecords[0];
        const recordsToDelete = scoredRecords.slice(1);
        recordsToBeRemoved += recordsToDelete.length;

        details.push({
          gtin,
          totalRecords: records.length,
          recordsToBeRemoved: recordsToDelete.length,
          recordToKeep: {
            id: recordToKeep.id,
            score: recordToKeep.score,
            itemCode: recordToKeep.itemCode,
            productSize: recordToKeep.productSize,
            whLocation: recordToKeep.whLocation,
            binLocation: recordToKeep.binLocation,
          },
          recordsToDelete: recordsToDelete.map(r => ({
            id: r.id,
            score: r.score,
            itemCode: r.itemCode,
            productSize: r.productSize,
            whLocation: r.whLocation,
            binLocation: r.binLocation,
          })),
        });

        // Log progress
        if ((i + batch.indexOf(duplicate) + 1) % 100 === 0) {
          console.log(
            `Progress: ${i + batch.indexOf(duplicate) + 1}/${duplicateGTINs.length} GTINs analyzed`
          );
        }
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      `Duplicate check completed: ${duplicateGTINs.length} duplicate GTINs found, ` +
      `${recordsToBeRemoved} records would be removed in ${duration}s`
    );

    res.status(200).json(
      generateResponse(200, true, "Duplicate GTINs analysis completed", {
        duplicateGTINsFound: duplicateGTINs.length,
        totalDuplicateRecords,
        recordsToBeKept: duplicateGTINs.length,
        recordsToBeRemoved,
        duration: `${duration}s`,
        details: details.slice(0, 100), // Return first 100 for reference
        note: details.length > 100
          ? `Only first 100 details shown. Total ${details.length} duplicate GTINs found. To see all, check server logs or use pagination.`
          : null,
        warning: "⚠️ This is a preview. To actually remove duplicates, use DELETE /api/itemCodes/v1/remove-duplicates",
      })
    );
  } catch (error) {
    console.error("Error checking duplicates:", error);
    next(error);
  }
};

exports.removeDuplicateGTINs = async (req, res, next) => {
  try {
    console.log("Starting duplicate GTIN removal process...");
    const startTime = Date.now();

    // Find all duplicate GTINs
    const duplicateGTINs = await ItemCodeModel.findDuplicateGTINs();

    if (!duplicateGTINs || duplicateGTINs.length === 0) {
      return res.status(200).json(
        generateResponse(200, true, "No duplicate GTINs found", {
          duplicatesFound: 0,
          recordsRemoved: 0,
        })
      );
    }

    console.log(`Found ${duplicateGTINs.length} duplicate GTINs`);

    let totalRecordsRemoved = 0;
    let processedCount = 0;
    const details = [];

    // Score a record based on how many fields are filled
    const scoreRecord = (record) => {
      let score = 0;
      const fieldsToCheck = [
        'ItemCode', 'EnglishName', 'ArabicName', 'GTIN', 'LotNo',
        'ExpiryDate', 'sERIALnUMBER', 'ItemQty', 'WHLocation',
        'BinLocation', 'QRCodeInternational', 'ModelName',
        'ProductionDate', 'ProductType', 'BrandName', 'PackagingType',
        'ProductUnit', 'ProductSize', 'image', 'upper', 'sole',
        'width', 'color', 'label'
      ];

      fieldsToCheck.forEach((field) => {
        if (record[field] !== null && record[field] !== undefined && record[field] !== '') {
          score++;
        }
      });

      return score;
    };

    // Process duplicates in batches
    const BATCH_SIZE = 100; // Process 100 duplicate GTINs at a time

    for (let i = 0; i < duplicateGTINs.length; i += BATCH_SIZE) {
      const batch = duplicateGTINs.slice(i, Math.min(i + BATCH_SIZE, duplicateGTINs.length));

      for (const duplicate of batch) {
        const gtin = duplicate.GTIN;
        const count = parseInt(duplicate.count);

        // Get all records with this GTIN
        const records = await ItemCodeModel.findAllByGTIN(gtin);

        if (records.length <= 1) {
          continue; // Skip if not actually duplicate
        }

        // Score each record
        const scoredRecords = records.map((record) => ({
          ...record,
          score: scoreRecord(record),
        }));

        // Sort by score (highest first), then by Created_at (most recent first)
        scoredRecords.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return new Date(b.Created_at) - new Date(a.Created_at);
        });

        // Keep the first one (highest score), delete the rest
        const recordToKeep = scoredRecords[0];
        const recordsToDelete = scoredRecords.slice(1);

        if (recordsToDelete.length > 0) {
          const idsToDelete = recordsToDelete.map((r) => r.id);
          await ItemCodeModel.deleteByIds(idsToDelete);
          totalRecordsRemoved += idsToDelete.length;

          details.push({
            gtin,
            totalRecords: records.length,
            recordsRemoved: idsToDelete.length,
            keptRecordId: recordToKeep.id,
            keptRecordScore: recordToKeep.score,
          });
        }

        processedCount++;

        // Log progress every 100 GTINs
        if (processedCount % 100 === 0) {
          console.log(
            `Progress: ${processedCount}/${duplicateGTINs.length} GTINs processed, ` +
            `${totalRecordsRemoved} records removed`
          );
        }
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      `Duplicate removal completed: ${totalRecordsRemoved} records removed in ${duration}s`
    );

    res.status(200).json(
      generateResponse(200, true, "Duplicate GTINs removed successfully", {
        duplicateGTINsFound: duplicateGTINs.length,
        recordsRemoved: totalRecordsRemoved,
        duration: `${duration}s`,
        details: details.slice(0, 100), // Return first 100 for reference
        note: details.length > 100
          ? "Only first 100 details shown. Check server logs for complete information."
          : null,
      })
    );
  } catch (error) {
    console.error("Error removing duplicates:", error);
    next(error);
  }
};

exports.deleteAllBarcodes = async (req, res, next) => {
  try {
    // Safety check: require confirmation parameter
    const confirmation = req.query.confirm || req.body.confirm;

    if (confirmation !== "DELETE_ALL_BARCODES") {
      const error = new CustomError(
        "Confirmation required. Add query parameter: ?confirm=DELETE_ALL_BARCODES"
      );
      error.statusCode = 400;
      throw error;
    }

    console.log("⚠️  Starting deletion of ALL barcode records...");
    const startTime = Date.now();

    // Count records before deletion
    const totalRecords = await ItemCodeModel.countAll();

    if (totalRecords === 0) {
      return res.status(200).json(
        generateResponse(200, true, "No records to delete", {
          recordsDeleted: 0,
        })
      );
    }

    console.log(`⚠️  Found ${totalRecords} records. Proceeding with deletion...`);

    // Delete all records
    const result = await ItemCodeModel.deleteAll();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Deletion completed: ${result.count} records deleted in ${duration}s`
    );

    res.status(200).json(
      generateResponse(200, true, "All barcode records deleted successfully", {
        recordsDeleted: result.count,
        duration: `${duration}s`,
        warning: "⚠️ This operation is irreversible. All barcode records have been permanently deleted.",
      })
    );
  } catch (error) {
    console.error("Error deleting all barcodes:", error);
    next(error);
  }
};

exports.deleteItemsWithoutBarcode = async (req, res, next) => {
  try {
    // Safety check: require confirmation parameter
    const confirmation = req.query.confirm || req.body.confirm;

    if (confirmation !== "DELETE_WITHOUT_BARCODE") {
      const error = new CustomError(
        "Confirmation required. Add query parameter: ?confirm=DELETE_WITHOUT_BARCODE"
      );
      error.statusCode = 400;
      throw error;
    }

    console.log("⚠️  Starting deletion of records without barcodes...");
    const startTime = Date.now();

    // Count records without barcode before deletion
    const recordsWithoutBarcode = await ItemCodeModel.countWithoutBarcode();

    if (recordsWithoutBarcode === 0) {
      return res.status(200).json(
        generateResponse(200, true, "No records without barcode found", {
          recordsDeleted: 0,
        })
      );
    }

    console.log(
      `⚠️  Found ${recordsWithoutBarcode} records without barcode. Proceeding with deletion...`
    );

    // Delete records without barcode
    const result = await ItemCodeModel.deleteWithoutBarcode();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Deletion completed: ${result.count} records without barcode deleted in ${duration}s`
    );

    res.status(200).json(
      generateResponse(200, true, "Records without barcode deleted successfully", {
        recordsDeleted: result.count,
        duration: `${duration}s`,
        warning: "⚠️ This operation is irreversible. All records without barcode have been permanently deleted.",
      })
    );
  } catch (error) {
    console.error("Error deleting records without barcode:", error);
    next(error);
  }
};
