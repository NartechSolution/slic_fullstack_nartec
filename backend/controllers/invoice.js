const { validationResult } = require("express-validator");

const POSInvoiceMaster = require("../models/tblPOSInvoiceMaster");
const POSInvoiceDetails = require("../models/tblPOSInvoiceDetails");
const POSInvoiceTemp = require("../models/TblSalesReturnInvoicetmp");
const response = require("../utils/response");
const CustomError = require("../exceptions/customError");
const prisma = require("../db");
const Joi = require("joi");

// exports.getInvoiceDetailsByTransactionCode = async (req, res, next) => {
//   const { transactionCode } = req.params; //

//   try {
//     // Validate the input
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       const msg = errors.errors[0].msg;
//       const error = new CustomError(msg);
//       error.statusCode = 422;
//       error.data = errors;
//       return next(error);
//     }

//     // Search for the transaction code in tblPOSInvoiceMaster
//     const invoiceMaster = await POSInvoiceMaster.getInvoiceMasterByField(
//       "TransactionCode",
//       transactionCode
//     );

//     if (!invoiceMaster || invoiceMaster.length === 0) {
//       const error = new CustomError(
//         "TransactionCode not found in Invoice Master"
//       );
//       error.statusCode = 404;
//       throw error;
//     }

//     // Get all records from tblPOSInvoiceDetails with the same TransactionCode
//     const invoiceDetails = await POSInvoiceDetails.getInvoiceDetailsByField(
//       "TransactionCode",
//       transactionCode
//     );

//     if (!invoiceDetails || invoiceDetails.length === 0) {
//       const error = new CustomError(
//         "No invoice details found for the provided TransactionCode"
//       );
//       error.statusCode = 404;
//       throw error;
//     }

//     // Return the details
//     res
//       .status(200)
//       .json(
//         response(
//           200,
//           true,
//           "Invoice details found successfully",
//           invoiceDetails
//         )
//       );
//   } catch (error) {
//     next(error);
//   }
// };

exports.getInvoiceDetailsByTransactionCode = async (req, res, next) => {
  const { transactionCode, invoiceNo } = req.query;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const data =
      await POSInvoiceDetails.getDetailsByInvoiceNoAndTransactionCode(
        invoiceNo,
        transactionCode
      );

    if (!data || data.length === 0) {
      const error = new CustomError("Items not found in Invoice Details");
      error.statusCode = 404;
      throw error;
    }

    for (const item of data) {
      console.log(item);
      const existing = await POSInvoiceTemp.getByItemSysIdAndItemCode(
        item.ItemSysID?.toString(),
        item.ItemSKU?.toString()
      );

      if (existing) {
        // update
        await POSInvoiceTemp.updateSalesReturnInvoice(
          item.ItemSysID?.toString(),
          item.ItemSKU?.toString(),
          {
            SNo: item.SNo != null ? Number(item.SNo) : null,
            ItemCode: item.ItemSKU?.toString(),
            Description: item.ItemSKU?.toString(),
            ReturnQty: item.ItemQry != null ? Number(item.ItemQry) : null,
            InvoiceQty: item.ItemQry != null ? Number(item.ItemQry) : null,
            UnitCode: item.ItemUnit?.toString(),
            HeadSysId: item.Head_SYS_ID?.toString(),
            ItemSysID: item.ItemSysID?.toString(),
            DeliveryLocationCode: item.DeliveryLocationCode?.toString(),
            ItemSize: item.ItemSize?.toString(),
          }
        );
        console.log("Item already exists, lets update it");
      } else {
        await POSInvoiceTemp.createSalesReturnInvoice({
          // Ensure no id field is being passed here
          SNo: item.SNo != null ? Number(item.SNo) : null,
          ItemCode: item.ItemSKU?.toString(),
          Description: item.ItemSKU?.toString(),
          ReturnQty: item.ItemQry != null ? Number(item.ItemQry) : null,
          InvoiceQty: item.ItemQry != null ? Number(item.ItemQry) : null,
          UnitCode: item.ItemUnit?.toString(),
          HeadSysId: item.Head_SYS_ID?.toString(),
          ItemSysID: item.ItemSysID?.toString(),
          DeliveryLocationCode: item.DeliveryLocationCode?.toString(),
          ItemSize: item.ItemSize?.toString(),
        });
      }
    }

    res
      .status(200)
      .json(response(200, true, "Invoice details found successfully", data));
  } catch (error) {
    next(error);
  }
};

exports.updateInvoiceTemp = async (req, res, next) => {
  try {
    const { ItemSysID, ItemCode, ReturnQty } = req.body;

    const tempItem = await POSInvoiceTemp.getByItemSysIdAndItemCode(
      ItemSysID,
      ItemCode
    );

    if (!tempItem) {
      const error = new CustomError("Item not found in Invoice Temp");
      error.statusCode = 404;
      throw error;
    }

    const updatedItem = await POSInvoiceTemp.updateSalesReturnInvoice(
      ItemSysID,
      ItemCode,
      {
        ReturnQty: Number(ReturnQty),
      }
    );

    res
      .status(200)
      .json(response(200, true, "Invoice Temp updated", updatedItem));
  } catch (error) {
    next(error);
  }
};

exports.invoiceHeadersAndLineItems = async (req, res, next) => {
  try {
    // Define the Joi schema
    const schema = Joi.object({
      InvoiceNo: Joi.string().required().messages({
        "any.required": "InvoiceNo is required",
        "string.empty": "InvoiceNo cannot be empty",
      }),
      TransactionCode: Joi.string().valid("IN", "SR").optional().messages({
        "any.only": "TransactionCode must be either 'IN' or 'SR'",
      }),
    });

    // Validate the request query against the schema
    const { error, value } = schema.validate(req.query);

    if (error) {
      const validationError = new CustomError(error.details[0].message);
      validationError.statusCode = 400;
      throw validationError;
    }

    const { InvoiceNo, TransactionCode } = value;

    // Construct filter for querying the invoice
    const filter = {
      InvoiceNo: InvoiceNo,
    };

    // Apply regex filter for 'IN' or 'SR' if TransactionCode is provided
    if (TransactionCode) {
      filter.TransactionCode = {
        endsWith: TransactionCode, // Prisma syntax for filtering based on suffix
      };
    }

    const invoiceHeader = await POSInvoiceMaster.getSingleInvoiceMasterByFilter(
      filter
    );

    if (!invoiceHeader) {
      const error = new CustomError("Invoice headers not found");
      error.statusCode = 404;
      throw error;
    }

    // Use the same filter to get invoice details
    const invoiceDetails = await POSInvoiceDetails.getInvoiceDetailsByFilter(
      filter
    );

    res.status(200).json(
      response(200, true, "Invoice headers & line items found successfully", {
        invoiceHeader,
        invoiceDetails,
      })
    );
  } catch (error) {
    next(error);
  }
};

exports.getInvoicesByMobileNo = async (req, res, next) => {
  try {
    const { MobileNo } = req.query;

    if (!MobileNo) {
      const error = new CustomError("MobileNo is required");
      error.statusCode = 400;
      throw error;
    }

    const invoices = await POSInvoiceMaster.getInvoiceMasterByField(
      "MobileNo",
      MobileNo
    );

    if (!invoices || invoices.length == 0) {
      const error = new CustomError("No invoice found with the given number");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(response(200, true, "Invoices found successfully", invoices));
  } catch (error) {
    next(error);
  }
};

// exports.saveInvoice = async (req, res, next) => {
//   try {
//     const { master, details } = req.body;

//     // Validate that master is an object and details is an array
//     if (!master || !details || !Array.isArray(details)) {
//       const error = new CustomError(
//         "Invalid data format. 'master' should be an object and 'details' should be an array."
//       );
//       error.statusCode = 400;
//       throw error;
//     }

//     // Check if the master invoice with the given InvoiceNo already exists
//     let existingMaster = await POSInvoiceMaster.getSingleInvoiceMasterByField(
//       "InvoiceNo",
//       master.InvoiceNo
//     );

//     let newMaster;
//     if (existingMaster) {
//       // Update the existing master invoice
//       newMaster = await POSInvoiceMaster.updateInvoiceMaster(
//         existingMaster.id,
//         master
//       );
//     } else {
//       // Create a new master invoice
//       newMaster = await POSInvoiceMaster.createInvoiceMaster(master);
//     }

//     // Create or update each detail item associated with the master invoice
//     const detailPromises = details.map(async (detail) => {
//       const detailData = { ...detail, Head_SYS_ID: newMaster.Head_SYS_ID };

//       if (detail.id) {
//         return await POSInvoiceDetails.updateInvoiceDetails(
//           detail.id,
//           detailData
//         );
//       } else {
//         return await POSInvoiceDetails.createInvoiceDetails(detailData);
//       }
//     });

//     const newDetails = await Promise.all(detailPromises);

//     res.status(201).json(
//       response(201, true, "Invoice saved successfully", {
//         invoiceMaster: newMaster,
//         invoiceDetails: newDetails,
//       })
//     );
//   } catch (error) {
//     next(error);
//   }
// };
exports.saveInvoice = async (req, res, next) => {
  try {
    const { master, details } = req.body;

    // Validate that master is an object and details is an array
    if (!master || !details || !Array.isArray(details)) {
      const error = new CustomError(
        "Invalid data format. 'master' should be an object and 'details' should be an array."
      );
      error.statusCode = 400;
      throw error;
    }

    // Create a new master invoice
    const newMaster = await POSInvoiceMaster.createInvoiceMaster(master);

    // Create each detail item associated with the master invoice
    const detailPromises = details.map(async (detail) => {
      const detailData = { ...detail, Head_SYS_ID: newMaster.Head_SYS_ID };
      return await POSInvoiceDetails.createInvoiceDetails(detailData);
    });

    const newDetails = await Promise.all(detailPromises);

    res.status(201).json(
      response(201, true, "Invoice saved successfully", {
        invoiceMaster: newMaster,
        invoiceDetails: newDetails,
      })
    );
  } catch (error) {
    next(error);
  }
};

const allowedBatchColumns = {
  id: Joi.string(),
  bulkCashDocNo: Joi.string(),
  bulkCashRefNo: Joi.string(),
  bankDepositNo: Joi.string().allow(null),
  createdAt: Joi.date(),
  isMatched: Joi.boolean(),
  updatedAt: Joi.date(),
};

exports.getPOSInvoiceBatch = async (req, res) => {
  try {
    // Define the schema for query validation
    const columnsSchema = Joi.object({
      columns: Joi.array().items(
        Joi.string().valid(...Object.keys(allowedBatchColumns))
      ),
      filter: Joi.object().pattern(Joi.string(), Joi.any()),
      cutoffDate: Joi.date().optional(), // Add cutoffDate as optional
      isMatched: Joi.boolean().optional(), // Filter for matched/unmatched records
    }).unknown(true);

    // Validate query parameters
    const { error, value } = columnsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        message: `Invalid query parameter: ${error.details[0].message}`,
      });
    }

    // Columns to select
    const selectedColumns =
      value.columns && value.columns.length > 0
        ? value.columns
        : Object.keys(allowedBatchColumns);

    const filterConditions = value.filter || {};

    // Convert cutoffDate to a valid filter condition if provided
    if (value.cutoffDate) {
      filterConditions.createdAt = {
        gt: new Date(value.cutoffDate), // Fetch records created after the cutoff date
      };
    }

    // Apply the isMatched filter if provided
    if (value.isMatched !== undefined) {
      filterConditions.isMatched = value.isMatched;
    }

    // Construct the select object to dynamically pick columns
    const select = selectedColumns.reduce((obj, col) => {
      obj[col] = true;
      return obj;
    }, {});

    // Always include the `id` column
    select.id = true;

    // Fetch the data from the database
    const invoiceBatches = await prisma.tblPOSInvoiceBatch.findMany({
      where: filterConditions,
      select,
      orderBy: { createdAt: "desc" },
      take: 30, // Limit to 30 records or customize as needed
    });

    // Return the response
    return res.json(invoiceBatches);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

exports.searchPOSInvoiceBatch = async (req, res, next) => {
  try {
    const { keyword } = req.query; // Get the search keyword from the query parameters

    // Ensure that the keyword is provided
    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({
        message: "Keyword is required for searching.",
      });
    }

    // Construct the search condition for Prisma query
    const searchConditions = {
      bulkCashDocNo: {
        contains: keyword.toLowerCase(), // Case-insensitive search by converting keyword to lowercase
      },
    };

    // Fetch the top 30 latest records that match the search conditions
    const invoiceBatches = await prisma.tblPOSInvoiceBatch.findMany({
      where: searchConditions,
      orderBy: { createdAt: "desc" }, // Sort by createdAt in descending order
      take: 30, // Limit to 30 records
    });

    // Return the found records
    return res.json(invoiceBatches);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Define the schema for validation
const createPOSInvoiceBatchSchema = Joi.object({
  bulkCashDocNo: Joi.string().required(),
  bulkCashRefNo: Joi.string().required(),
  invoiceMasterIds: Joi.array().items(Joi.string().required()).required(), // Assuming IDs are strings (UUIDs)
});

exports.createPOSInvoiceBatch = async (req, res, next) => {
  try {
    // Validate the incoming request body using Joi
    const { error, value } = createPOSInvoiceBatchSchema.validate(req.body);

    if (error) {
      const validationError = new CustomError(
        `Validation error: ${error.details[0].message}`
      );
      validationError.statusCode = 400;
      throw validationError;
    }

    const { bulkCashDocNo, bulkCashRefNo, invoiceMasterIds } = value;

    // Create a new POSInvoiceBatch using Prisma
    const newBatch = await prisma.tblPOSInvoiceBatch.create({
      data: {
        bulkCashDocNo,
        bulkCashRefNo,
      },
    });

    // Update POSInvoiceMaster records to set batchId
    const updatePromises = invoiceMasterIds.map(async (id) => {
      const invoiceMaster = await prisma.tblPOSInvoiceMaster.findUnique({
        where: { id },
      });

      if (!invoiceMaster) {
        const error = new CustomError(
          `Invoice Master record with id ${id} not found`
        );
        error.statusCode = 404;
        throw error;
      }

      // Set the batchId for each invoice master record using Prisma
      return prisma.tblPOSInvoiceMaster.update({
        where: { id },
        data: { batchId: newBatch.id },
      });
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    res.status(201).json({
      success: true,
      message: "POSInvoiceBatch created and batchId assigned to records",
      data: newBatch,
    });
  } catch (error) {
    next(error);
  }
};

const errorLogSchema = Joi.object({
  inDocumentNo: Joi.string().optional(),
  inRefSysId: Joi.string().optional(),
  srDocumentNo: Joi.string().optional(),
  srRefSysId: Joi.string().optional(),
  transactionType: Joi.string().optional(),
});

exports.createErrorLogs = async (req, res, next) => {
  try {
    // Validate the request body
    const { error, value } = errorLogSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: `Validation error: ${error.details[0].message}`,
      });
    }

    // Create the error log using Prisma
    const newErrorLog = await prisma.errorLog.create({
      data: {
        inDocumentNo: value.inDocumentNo,
        inRefSysId: value.inRefSysId,
        srDocumentNo: value.srDocumentNo,
        srRefSysId: value.srRefSysId,
        transactionType: value.transactionType,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Error log created successfully",
      data: newErrorLog,
    });
  } catch (err) {
    console.error("Error creating error log:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getErrorLogs = async (req, res, next) => {
  try {
    const { inDocumentNo, srDocumentNo, transactionType } = req.query;

    // Build the filter conditions based on query parameters
    const filterConditions = {};
    if (inDocumentNo) filterConditions.inDocumentNo = inDocumentNo;
    if (srDocumentNo) filterConditions.srDocumentNo = srDocumentNo;
    if (transactionType) filterConditions.transactionType = transactionType;

    // Fetch the error logs using Prisma
    const errorLogs = await prisma.errorLog.findMany({
      where: filterConditions,
      orderBy: { createdAt: "desc" },
      take: 30, // Limit to 30 records
    });

    return res.json({
      success: true,
      data: errorLogs,
    });
  } catch (err) {
    console.error("Error fetching error logs:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Define the schema for validation
const updatePOSInvoiceBatchSchema = Joi.object({
  bulkCashDocNo: Joi.string().optional(),
  bulkCashRefNo: Joi.string().optional(),
  bankDepositNo: Joi.string().optional(),
  isMatched: Joi.boolean().optional(),
});

exports.updatePOSInvoiceBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    // Validate the request body using Joi
    const { error, value } = updatePOSInvoiceBatchSchema.validate(req.body);

    if (error) {
      const validationError = new CustomError(
        `Validation error: ${error.details[0].message}`
      );
      validationError.statusCode = 400;
      throw validationError;
    }

    // Find the batch by its ID
    const batch = await prisma.tblPOSInvoiceBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      const error = new CustomError(
        `POSInvoiceBatch with id ${batchId} not found`
      );
      error.statusCode = 404;
      throw error;
    }

    // Update the batch using Prisma
    const updatedBatch = await prisma.tblPOSInvoiceBatch.update({
      where: { id: batchId },
      data: value, // Joi-validated body contains only the fields to update
    });

    res.status(200).json({
      success: true,
      message: "POSInvoiceBatch updated successfully",
      data: updatedBatch,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllMaters = async (req, res, next) => {
  try {
    const allInvoices = await POSInvoiceMaster.getAllInvoiceDetails();

    if (!allInvoices || allInvoices.length === 0) {
      const error = new CustomError("No invoices found");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        response(
          200,
          true,
          "All invoice details retrieved successfully",
          allInvoices
        )
      );
  } catch (error) {
    next(error);
  }
};

// exports.getAllMaters = async (req, res, next) => {
//   try {
//     // Get sorting parameters from query (if any)
//     const sortParams = req.query;

//     // Define the valid fields that can be used for sorting
//     const validFields = [
//       "Rec_Num",
//       "TblSysNoID",
//       "SNo",
//       "DeliveryLocationCode",
//       "ItemSysID",
//       "InvoiceNo",
//       "Head_SYS_ID",
//       "TransactionCode",
//       "CustomerCode",
//       "SalesLocationCode",
//       "Remarks",
//       "TransactionType",
//       "UserID",
//       "MobileNo",
//       "TransactionDate",
//       "VatNumber",
//       "CustomerName",
//     ];

//     // Create the sortFields object
//     const sortFields = {};

//     // Loop through the query parameters and add valid sorting fields to sortFields object
//     for (const field in sortParams) {
//       if (validFields.includes(field)) {
//         // Assume sort order as either 'asc' or 'desc' passed as query value, default to 'asc'
//         sortFields[field] = sortParams[field] === "desc" ? "desc" : "asc";
//       }
//     }

//     // Fetch all invoices with sorting
//     const allInvoices = await POSInvoiceMaster.getAllInvoiceDetails(sortFields);

//     if (!allInvoices || allInvoices.length === 0) {
//       const error = new CustomError("No invoices found");
//       error.statusCode = 404;
//       throw error;
//     }

//     res
//       .status(200)
//       .json(
//         response(
//           200,
//           true,
//           "All invoice details retrieved successfully",
//           allInvoices
//         )
//       );
//   } catch (error) {
//     next(error);
//   }
// };

exports.getInvoiceDetailsByInvoiceNo = async (req, res, next) => {
  const { InvoiceNo } = req.query;

  try {
    if (!InvoiceNo) {
      const error = new CustomError("InvoiceNo is required");
      error.statusCode = 400;
      throw error;
    }

    const invoiceMaster = await POSInvoiceDetails.getInvoiceDetailsByField(
      "InvoiceNo",
      InvoiceNo
    );

    if (!invoiceMaster) {
      const error = new CustomError(
        `Invoice with number ${InvoiceNo} not found.`
      );
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        response(
          200,
          true,
          "Invoice master retrieved successfully",
          invoiceMaster
        )
      );
  } catch (error) {
    next(error);
  }
};

exports.archiveInvoice = async (req, res, next) => {
  try {
    const schema = Joi.object({
      invoiceNo: Joi.string().required().messages({
        "any.required": "Invoice number is required",
        "string.empty": "Invoice number cannot be empty",
      }),
      itemsToReturn: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().required().messages({
              "any.required": "Item ID is required",
              "string.empty": "Item ID cannot be empty",
            }),
            qtyToReturn: Joi.number().integer().positive().required().messages({
              "any.required": "Quantity to return is required",
              "number.base": "Quantity must be a number",
              "number.integer": "Quantity must be an integer",
              "number.positive": "Quantity must be greater than zero",
            }),
          })
        )
        .min(1)
        .required()
        .messages({
          "array.min": "At least one item is required to return",
          "any.required": "Items to return are required",
        }),
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: error.details.map((err) => err.message),
      });
    }

    const { invoiceNo, itemsToReturn } = value;

    // Fetch the invoice master data
    const invoiceMaster = await prisma.tblPOSInvoiceMaster.findFirst({
      where: { InvoiceNo: invoiceNo },
    });

    if (!invoiceMaster) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Fetch the details of all the items in the invoice
    const invoiceDetails = await prisma.tblPOSInvoiceDetails.findMany({
      where: {
        InvoiceNo: invoiceNo,
        id: { in: itemsToReturn.map((item) => item.id) },
      },
    });

    if (invoiceDetails.length === 0) {
      return res
        .status(404)
        .json({ error: "No matching items found in invoice" });
    }

    // Insert the master record into the archive table if not already archived
    const { id: masterId, ...invoiceMasterDataWithoutId } = invoiceMaster;

    // Check if the archive record exists
    const existingArchiveRecord =
      await prisma.tblPOSInvoiceMasterArchive.findFirst({
        where: { InvoiceNo: invoiceNo },
      });

    if (existingArchiveRecord) {
      // Update existing archive record
      await prisma.tblPOSInvoiceMasterArchive.update({
        where: { id: existingArchiveRecord.id },
        data: {
          ...invoiceMasterDataWithoutId,
        },
      });
    } else {
      // Create new archive record
      await prisma.tblPOSInvoiceMasterArchive.create({
        data: {
          ...invoiceMasterDataWithoutId,
        },
      });
    }

    // Process each item to return
    let totalReturnAmount = 0;

    for (const item of itemsToReturn) {
      const detailItem = invoiceDetails.find((d) => d.id === item.id);

      if (!detailItem) {
        return res.status(400).json({
          error: `Item with id ${item.id} not found in invoice details`,
        });
      }

      const qtyToReturn = item.qtyToReturn;

      if (detailItem.ItemQry < qtyToReturn) {
        return res.status(400).json({
          error: `Quantity to return exceeds quantity purchased for item with id ${item.id}`,
        });
      }

      // Calculate return amount
      const returnAmount = detailItem.ItemPrice * qtyToReturn;
      totalReturnAmount += returnAmount;

      // Check if the item is already in the archive
      const existingDetailArchiveRecord =
        await prisma.tblPOSInvoiceDetailsArchive.findFirst({
          where: {
            InvoiceNo: detailItem.InvoiceNo,
            ItemSysID: detailItem.ItemSysID,
          },
        });

      if (existingDetailArchiveRecord) {
        // Update the existing archive record by increasing the quantity
        await prisma.tblPOSInvoiceDetailsArchive.update({
          where: { id: existingDetailArchiveRecord.id },
          data: {
            ItemQry: existingDetailArchiveRecord.ItemQry + qtyToReturn, // Increase the quantity by the returned amount
          },
        });
      } else {
        const { ReturnQty, id, ...validDetailItemData } = detailItem;

        // Insert a new record if it doesn't exist in the archive
        await prisma.tblPOSInvoiceDetailsArchive.create({
          data: {
            ...validDetailItemData, // Spread the valid fields
            ItemQry: qtyToReturn, // Set the returned quantity
          },
        });
      }

      // Update or delete the item in the original details table
      if (detailItem.ItemQry === qtyToReturn) {
        // Full return of the item: delete from tblPOSInvoiceDetails
        await prisma.tblPOSInvoiceDetails.delete({
          where: { id: detailItem.id },
        });
      } else {
        // Partial return: update the quantity in tblPOSInvoiceDetails
        await prisma.tblPOSInvoiceDetails.update({
          where: { id: detailItem.id },
          data: { ItemQry: detailItem.ItemQry - qtyToReturn },
        });
      }
    }

    // Update the invoice master and archive tables with the new AdjAmount and PendingAmount
    const newAdjAmount = invoiceMaster.AdjAmount - totalReturnAmount;
    const newPendingAmount = invoiceMaster.PendingAmount - totalReturnAmount;

    // Update tblPOSInvoiceMaster using the unique identifier (assuming `id` is unique)
    await prisma.tblPOSInvoiceMaster.update({
      where: { id: invoiceMaster.id },
      data: {
        AdjAmount: newAdjAmount,
        PendingAmount: newPendingAmount,
      },
    });

    // Update tblPOSInvoiceMasterArchive using the unique identifier
    if (existingArchiveRecord) {
      await prisma.tblPOSInvoiceMasterArchive.update({
        where: { id: existingArchiveRecord.id },
        data: {
          AdjAmount: newAdjAmount,
          PendingAmount: newPendingAmount,
        },
      });
    }

    // Check if all items have been returned, in which case delete the master record
    const remainingItems = await prisma.tblPOSInvoiceDetails.count({
      where: { InvoiceNo: invoiceNo },
    });

    if (remainingItems === 0) {
      // Delete the master record
      await prisma.tblPOSInvoiceMaster.delete({
        where: { id: invoiceMaster.id },
      });

      // Also delete any remaining details records, if they exist
      await prisma.tblPOSInvoiceDetails.deleteMany({
        where: { InvoiceNo: invoiceNo },
      });
    }

    res
      .status(200)
      .json({ message: "Items returned and invoice archived successfully" });
  } catch (error) {
    next(error);
  }
};

const allowedMasterColumns = {
  Rec_Num: Joi.number(),
  TblSysNoID: Joi.number(),
  SNo: Joi.number(),
  DeliveryLocationCode: Joi.string(),
  ItemSysID: Joi.string(),
  InvoiceNo: Joi.string(),
  Head_SYS_ID: Joi.string(),
  TransactionCode: Joi.string(),
  CustomerCode: Joi.string(),
  SalesLocationCode: Joi.string(),
  Remarks: Joi.string(),
  TransactionType: Joi.string(),
  UserID: Joi.string(),
  MobileNo: Joi.string(),
  TransactionDate: Joi.date(),
  id: Joi.string(),
  VatNumber: Joi.string(),
  CustomerName: Joi.string(),
  isReceiptCreated: Joi.boolean(),
  createdAt: Joi.date(),
  updatedAt: Joi.date(),
  AdjAmount: Joi.number(),
  DocNo: Joi.string(),
  PendingAmount: Joi.number(),
  zatcaPayment_mode_id: Joi.string(),
  zatcaPayment_mode_name: Joi.string(),
  BRV_REF_NO: Joi.string(),
};
exports.getPOSInvoiceMaster = async (req, res) => {
  try {
    // Define the schema for query validation
    const columnsSchema = Joi.object({
      columns: Joi.array().items(
        Joi.string().valid(...Object.keys(allowedMasterColumns))
      ),
      filter: Joi.object().pattern(Joi.string(), Joi.any()),
      cutoffDate: Joi.date().optional(), // Add cutoffDate as optional
      isBatchIdNull: Joi.boolean().optional(), // Filter for batchId being null or not null
    }).unknown(true);

    const { error, value } = columnsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        message: `Invalid query parameter: ${error.details[0].message}`,
      });
    }

    const selectedColumns =
      value.columns && value.columns.length > 0
        ? value.columns
        : Object.keys(allowedMasterColumns);

    const filterConditions = value.filter || {};

    // Convert TransactionDate filter to a valid Date object
    if (filterConditions.TransactionDate) {
      filterConditions.TransactionDate = new Date(
        filterConditions.TransactionDate
      );
    }

    // If cutoffDate is provided, add it to the filter conditions
    if (value.cutoffDate) {
      filterConditions.TransactionDate = {
        gt: new Date(value.cutoffDate), // Fetch records after the cutoff date
      };
    }

    // Ensure batchId takes priority over isBatchIdNull
    if (!value.filter.batchId) {
      if (value.isBatchIdNull !== undefined) {
        filterConditions.batchId = value.isBatchIdNull ? null : { not: null };
      }
    }

    // Ensure that batchId is always selected in the response
    const select = selectedColumns.reduce((obj, col) => {
      obj[col] = true;
      return obj;
    }, {});

    // Always include batchId in the response
    select.batchId = true;

    const invoices = await prisma.tblPOSInvoiceMaster.findMany({
      where: filterConditions,
      select,
      orderBy: {
        TransactionDate: "desc",
      },
    });

    return res.json(invoices);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getPOSInvoiceMasterArchive = async (req, res) => {
  try {
    const columnsSchema = Joi.object({
      columns: Joi.array().items(
        Joi.string().valid(...Object.keys(allowedMasterColumns))
      ),
      filter: Joi.object().pattern(Joi.string(), Joi.any()),
    }).unknown(true);

    const { error, value } = columnsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        message: `Invalid query parameter: ${error.details[0].message}`,
      });
    }

    const selectedColumns =
      value.columns && value.columns.length > 0
        ? value.columns
        : Object.keys(allowedMasterColumns);

    const filterConditions = value.filter || {};

    const select = selectedColumns.reduce((obj, col) => {
      obj[col] = true;
      return obj;
    }, {});

    const invoices = await prisma.tblPOSInvoiceMasterArchive.findMany({
      where: filterConditions,
      select,
      orderBy: {
        TransactionDate: "desc",
      },
    });

    return res.json(invoices);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

const allowedDetailsColumns = {
  Rec_Num: Joi.number(),
  TblSysNoID: Joi.number(),
  SNo: Joi.number(),
  DeliveryLocationCode: Joi.string(),
  ItemSysID: Joi.string(),
  InvoiceNo: Joi.string(),
  Head_SYS_ID: Joi.string(),
  TransactionCode: Joi.string(),
  CustomerCode: Joi.string(),
  SalesLocationCode: Joi.string(),
  Remarks: Joi.string(),
  TransactionType: Joi.string(),
  UserID: Joi.string(),
  ItemSKU: Joi.string(),
  ItemUnit: Joi.string(),
  ItemSize: Joi.string(),
  ITEMRATE: Joi.number(),
  ItemPrice: Joi.number(),
  ItemQry: Joi.number(),
  TransactionDate: Joi.date(),
  id: Joi.string(),
};

exports.getPOSInvoiceDetailsArchive = async (req, res) => {
  try {
    const columnsSchema = Joi.object({
      columns: Joi.array().items(
        Joi.string().valid(...Object.keys(allowedDetailsColumns))
      ),
      filter: Joi.object().pattern(Joi.string(), Joi.any()),
    }).unknown(true);

    const { error, value } = columnsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        message: `Invalid query parameter: ${error.details[0].message}`,
      });
    }

    const selectedColumns =
      value.columns && value.columns.length > 0
        ? value.columns
        : Object.keys(allowedDetailsColumns);

    const filterConditions = value.filter || {};

    const select = selectedColumns.reduce((obj, col) => {
      obj[col] = true;
      return obj;
    }, {});

    const details = await prisma.tblPOSInvoiceDetailsArchive.findMany({
      where: filterConditions,
      select,
      orderBy: {
        TransactionDate: "desc",
      },
    });

    return res.json(details);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getInvoiceDetailsByInvoiceNos = async (req, res, next) => {
  const { InvoiceNo } = req.body; // Get data from body instead of query

  try {
    // Check if InvoiceNo is provided and is an array
    if (!InvoiceNo || !Array.isArray(InvoiceNo)) {
      const error = new CustomError("A list of InvoiceNo is required");
      error.statusCode = 400;
      throw error;
    }

    // Fetch invoice details for multiple InvoiceNo
    const invoiceDetails = await POSInvoiceDetails.getInvoiceDetailsByFieldTwo(
      "InvoiceNo",
      InvoiceNo
    );

    if (!invoiceDetails || invoiceDetails.length === 0) {
      const error = new CustomError(
        `No invoice details found for the provided invoice numbers.`
      );
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        response(
          200,
          true,
          "Invoice details retrieved successfully",
          invoiceDetails
        )
      );
  } catch (error) {
    next(error);
  }
};

exports.getCustomersWithPendingReceipts = async (req, res, next) => {
  try {
    // Define Joi schema for validation
    const schema = Joi.object({
      SalesLocationCode: Joi.string().required().messages({
        "any.required": "SalesLocationCode is required",
        "string.empty": "SalesLocationCode cannot be empty",
      }),
      cutoffDate: Joi.date().required().messages({
        "any.required": "cutoffDate is required",
        "date.base": "cutoffDate must be a valid date",
      }),
    });

    // Validate the request query parameters
    const { error, value } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: error.details.map((err) => err.message),
      });
    }

    const { SalesLocationCode, cutoffDate } = value;

    // Fetch all unique customer codes where isReceiptCreated is false, SalesLocationCode matches, and createdAt is after cutoffDate
    const customersWithPendingReceipts =
      await prisma.tblPOSInvoiceMaster.findMany({
        where: {
          isReceiptCreated: false, // Filter where receipt is not created
          SalesLocationCode: SalesLocationCode, // Filter by SalesLocationCode
          TransactionDate: {
            gt: new Date(cutoffDate), // Fetch records created after the cutoffDate
          },
        },
        select: {
          CustomerCode: true, // Select only the CustomerCode field
        },
        distinct: ["CustomerCode"], // Ensure uniqueness of CustomerCode
      });

    if (customersWithPendingReceipts.length === 0) {
      return res
        .status(404)
        .json({ message: "No customers found with pending receipts" });
    }

    res.status(200).json({
      customerCodes: customersWithPendingReceipts.map(
        (record) => record.CustomerCode
      ),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateReceiptStatus = async (req, res) => {
  try {
    // Define Joi schema for validation
    const schema = Joi.object({
      ids: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .required()
        .messages({
          "array.min": "At least one id is required",
          "any.required": "IDs are required",
        }),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: `Invalid input: ${error.details[0].message}`,
      });
    }

    const { ids } = value;

    // Update isReceiptCreated to true for all provided ids
    const updateResult = await prisma.tblPOSInvoiceMaster.updateMany({
      where: {
        id: {
          in: ids, // Update only the records that match the given ids
        },
      },
      data: {
        isReceiptCreated: true, // Set isReceiptCreated to true
      },
    });

    // Check if any records were updated
    if (updateResult.count === 0) {
      return res.status(404).json({
        message: "No records found to update",
      });
    }

    return res.status(200).json({
      message: `${updateResult.count} record(s) updated successfully`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error: " + error.message });
  }
};

// TAX Controller

const allowedTaxColumns = {
  id: Joi.string(),
  taxAmount: Joi.number().precision(2).min(1).max(100),
  createdAt: Joi.date(),
  updatedAt: Joi.date(),
};

exports.getTaxRecords = async (req, res) => {
  try {
    const columnsSchema = Joi.object({
      columns: Joi.array().items(
        Joi.string().valid(...Object.keys(allowedTaxColumns))
      ),
      filter: Joi.object().pattern(Joi.string(), Joi.any()),
    }).unknown(true);

    const { error, value } = columnsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        message: `Invalid query parameter: ${error.details[0].message}`,
      });
    }

    const selectedColumns =
      value.columns && value.columns.length > 0
        ? value.columns
        : Object.keys(allowedTaxColumns);

    const filterConditions = value.filter || {};

    const select = selectedColumns.reduce((obj, col) => {
      obj[col] = true;
      return obj;
    }, {});

    select.id = true;

    const taxRecords = await prisma.tblTax.findMany({
      where: filterConditions,
      select,
      orderBy: { createdAt: "desc" },
    });

    return res.json(taxRecords);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

const createTaxSchema = Joi.object({
  taxAmount: Joi.number().precision(2).min(1).max(100).required(),
});

exports.createTaxRecord = async (req, res, next) => {
  try {
    const { error, value } = createTaxSchema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json({ message: `Validation error: ${error.details[0].message}` });
    }

    const { taxAmount } = value;

    const newTax = await prisma.tblTax.create({
      data: { taxAmount },
    });

    res.status(201).json({
      success: true,
      message: "Tax record created successfully",
      data: newTax,
    });
  } catch (error) {
    next(error);
  }
};

const updateTaxSchema = Joi.object({
  taxAmount: Joi.number().precision(2).min(1).max(100).required(),
});

exports.updateTaxRecord = async (req, res, next) => {
  try {
    const { taxId } = req.params;
    const { error, value } = updateTaxSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const taxRecord = await prisma.tblTax.findUnique({
      where: { id: taxId },
    });

    if (!taxRecord) {
      return res
        .status(404)
        .json({ message: `Tax record with id ${taxId} not found` });
    }

    const updatedTax = await prisma.tblTax.update({
      where: { id: taxId },
      data: value,
    });

    res.status(200).json({
      success: true,
      message: "Tax record updated successfully",
      data: updatedTax,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTaxRecord = async (req, res, next) => {
  try {
    const { taxId } = req.params;

    const taxRecord = await prisma.tblTax.findUnique({
      where: { id: taxId },
    });

    if (!taxRecord) {
      const notFoundError = new Error(`Tax record with id ${taxId} not found`);
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    await prisma.tblTax.delete({
      where: { id: taxId },
    });

    res.status(200).json({
      success: true,
      message: "Tax record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
