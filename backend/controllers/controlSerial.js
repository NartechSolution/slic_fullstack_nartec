const { validationResult } = require("express-validator");
const { ControlSerialModel, ControlSerialMasterModel } = require("../models/controlSerial");
const ItemCodeModel = require("../models/tblItemCodes1S1Br");
const SupplierModel = require("../models/supplier");
const BinLocationModel = require("../models/binLocation");
const { sendControlSerialNotificationEmail } = require("../utils/emailManager");
const generateResponse = require("../utils/response");
const CustomError = require("../exceptions/customError");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Fire lifecycle events for a list of serial numbers.
 * Uses createMany for performance. Fire-and-forget (do not await in hot paths).
 * @param {string[]} serialNumbers
 * @param {string} eventType  CREATED | SENT_TO_SUPPLIER | RECEIVED | PUT_AWAY | MERGED
 * @param {string} description
 * @param {object} [metadata]
 */
async function fireSerialEvents(serialNumbers, eventType, description, metadata = null) {
  if (!serialNumbers || serialNumbers.length === 0) return;
  const metaStr = metadata ? JSON.stringify(metadata) : null;
  try {
    await prisma.serialEvent.createMany({
      data: serialNumbers.map((sn) => ({
        serialNumber: sn,
        eventType,
        description,
        metadata: metaStr,
        performedBy: "System",
      })),
      skipDuplicates: false,
    });
  } catch (err) {
    // Non-critical — do not crash the main flow
    console.error(`[SerialEvent] Failed to fire ${eventType} events:`, err.message);
  }
}

// ── GS1 SSCC-18 generator ────────────────────────────────────────────────────
const GS1_COMPANY_PREFIX = "6287898"; // SLIC KSA registered company prefix (starts with 628)
const SSCC_EXTENSION_DIGIT = "0";     // Extension digit

function calcMod10CheckDigit(digits17) {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(digits17[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function buildSSCC(serialRef) {
  // serialRef: 9-digit string
  const raw = SSCC_EXTENSION_DIGIT + GS1_COMPANY_PREFIX + serialRef; // 17 digits
  return raw + calcMod10CheckDigit(raw);                              // 18 digits
}

/**
 * Generate serial number using formula: ItemCode + 6-digit series number
 */
function generateSerialNumber(itemCode, seriesNumber) {
  return `${itemCode}${seriesNumber}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE — POST /api/controlSerials
// Creates one ControlSerialMaster + N ControlSerial children
// Optimised for 500k+ qty: 3 parallel DB lookups + raw-SQL bulk INSERT
// ═══════════════════════════════════════════════════════════════════════════
exports.createControlSerials = async (req, res, next) => {
  try {
    const start = Date.now();
    const { ItemCode, supplierId, poNumber, sizeQuantities } = req.body;

    // ── Step 0: Validate & Consolidate Input ────────────────────────────
    if (!sizeQuantities || !Array.isArray(sizeQuantities)) {
      const error = new CustomError("sizeQuantities array is required");
      error.statusCode = 400;
      throw error;
    }

    // Validate and consolidate sizes — now supports rightQty/leftQty
    const consolidatedMap = new Map();
    for (const item of sizeQuantities) {
      if (!item.size) continue;
      const rQty = Number(item.rightQty) || Number(item.qty) || 0;
      const lQty = Number(item.leftQty) || 0;
      if (rQty <= 0 && lQty <= 0) continue;

      const existing = consolidatedMap.get(item.size) || { rightQty: 0, leftQty: 0 };
      consolidatedMap.set(item.size, {
        rightQty: existing.rightQty + rQty,
        leftQty: existing.leftQty + lQty,
      });
    }

    const validSizeQuantities = Array.from(consolidatedMap.entries()).map(([size, qtys]) => ({
      size,
      rightQty: qtys.rightQty,
      leftQty: qtys.leftQty,
    }));

    if (validSizeQuantities.length === 0) {
      const error = new CustomError("No valid size/quantity found (Quantities must be > 0)");
      error.statusCode = 400;
      throw error;
    }

    // ── Step 1: Parallel lookups (supplier + all products at once) ─────────
    const [supplier, ...products] = await Promise.all([
      SupplierModel.getSupplierById(supplierId),
      ...validSizeQuantities.map((item) => ItemCodeModel.findByItemCodeAndSize(ItemCode, item.size)),
    ]);

    if (!supplier) {
      const error = new CustomError("Supplier not found");
      error.statusCode = 404;
      throw error;
    }

    // Map size → product, validate all found
    const sizeProductMap = new Map();
    for (let i = 0; i < validSizeQuantities.length; i++) {
      const product = products[i];
      if (!product) {
        const error = new CustomError(
          `Product with ItemCode "${ItemCode}" and size "${validSizeQuantities[i].size}" not found`
        );
        error.statusCode = 404;
        throw error;
      }
      sizeProductMap.set(validSizeQuantities[i].size, product);
    }

    const primaryProduct = sizeProductMap.get(validSizeQuantities[0].size);

    // ── Step 2: Create master record ────────────────────────────────────────
    const masterPromise = ControlSerialMasterModel.create({
      productId: primaryProduct.id,
      poNumber,
      supplierId,
    });

    // ── Step 3: One SQL query for MAX serial per unique product  ────────────
    const uniqueProductIds = [...new Set([...sizeProductMap.values()].map((p) => p.id))];
    const seriesStartMap = await ControlSerialModel.getNextSeriesNumbersBatch(uniqueProductIds);

    const master = await masterPromise;

    // ── Step 4: Generate 2 serial objects per size (1 Right + 1 Left) ──
    const serials = [];
    const counterMap = new Map(seriesStartMap);

    let totalQty = 0;
    for (const { size, rightQty, leftQty } of validSizeQuantities) {
      const product = sizeProductMap.get(size);
      let currentNum = parseInt(counterMap.get(product.id), 10);
      totalQty += rightQty + leftQty;

      // Right serial
      if (rightQty > 0) {
        if (currentNum > 999999) throw new Error("Series number exceeds maximum value (999999)");
        serials.push({
          serialNumber: `${ItemCode}${currentNum.toString().padStart(6, "0")}`,
          ItemCode: product.id,
          supplierId,
          poNumber,
          size,
          masterId: master.id,
          side: "R",
          sideQty: rightQty,
        });
        currentNum++;
      }

      // Left serial
      if (leftQty > 0) {
        if (currentNum > 999999) throw new Error("Series number exceeds maximum value (999999)");
        serials.push({
          serialNumber: `${ItemCode}${currentNum.toString().padStart(6, "0")}`,
          ItemCode: product.id,
          supplierId,
          poNumber,
          size,
          masterId: master.id,
          side: "L",
          sideQty: leftQty,
        });
        currentNum++;
      }

      counterMap.set(product.id, currentNum.toString().padStart(6, "0"));
    }

    // ── Step 5: Bulk raw-SQL INSERT (1 000 rows/chunk, 50 parallel) ─────────
    const result = await ControlSerialModel.createBulkBatched(serials);

    if (!result || result.count === 0) {
      const error = new CustomError("Failed to create control serials");
      error.statusCode = 500;
      throw error;
    }

    // ── Step 6: Fire CREATED events (async, non-blocking) ────────────────────
    const serialNumbers = serials.map((s) => s.serialNumber);
    const product = sizeProductMap.get(validSizeQuantities[0].size);
    fireSerialEvents(
      serialNumbers,
      "CREATED",
      `Serial created for PO ${poNumber}`,
      { poNumber, itemCode: product?.ItemCode, totalQty }
    ); // intentionally not awaited

    const durationMs = Date.now() - start;

    // Always return a summary — fetching back 500k rows for a response is wasteful
    const totalSerials = serials.length;
    res.status(201).json(
      generateResponse(201, true, `${totalSerials} control serial(s) created (${totalQty} total units)`, {
        totalSerials,
        master: {
          id: master.id,
          poNumber: master.poNumber,
          supplierId: master.supplierId,
          productId: master.productId,
          isSentToSupplier: master.isSentToSupplier,
          receivedStatus: master.receivedStatus,
          createdAt: master.createdAt,
        },
        totalQty,
        firstSerial: serials[0]?.serialNumber ?? null,
        lastSerial: serials[serials.length - 1]?.serialNumber ?? null,
        durationMs,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET MASTERS — GET /api/controlSerials/masters
// ═══════════════════════════════════════════════════════════════════════════
exports.getMasters = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || null;
    const supplierId = req.query.supplierId || null;
    const itemCode = req.query.itemCode || null;

    let isArchived = null;
    if (req.query.isArchived === "true") isArchived = true;
    else if (req.query.isArchived !== undefined && req.query.isArchived !== null) isArchived = false;

    let isSentToSupplier = null;
    if (req.query.isSentToSupplier === "true") isSentToSupplier = true;
    else if (req.query.isSentToSupplier === "false") isSentToSupplier = false;

    const result = await ControlSerialMasterModel.findAllWithPagination({
      page, limit, search, isArchived, isSentToSupplier, supplierId, itemCode,
    });

    if (!result.masters || result.masters.length === 0) {
      const error = new CustomError("No control serial masters found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json(
      generateResponse(200, true, "Control serial masters retrieved successfully", result)
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET MASTER BY ID — GET /api/controlSerials/masters/:id
// ═══════════════════════════════════════════════════════════════════════════
exports.getMasterById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const master = await ControlSerialMasterModel.findById(id);

    if (!master) {
      const error = new CustomError("Control serial master not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(
      generateResponse(200, true, "Control serial master retrieved successfully", master)
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// RECEIVE WITH QTY — PUT /api/controlSerials/masters/:id/receive
// Supplier enters how many units received per size
// ═══════════════════════════════════════════════════════════════════════════
exports.receiveWithQty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sizeReceived } = req.body;

    if (!sizeReceived || !Array.isArray(sizeReceived) || sizeReceived.length === 0) {
      const error = new CustomError("sizeReceived array is required");
      error.statusCode = 400;
      throw error;
    }

    // Validate master exists
    const master = await ControlSerialMasterModel.findById(id);
    if (!master) {
      const error = new CustomError("Control serial master not found");
      error.statusCode = 404;
      throw error;
    }

    // Build per-size summary based on UNITS (sideQty) — not serial count
    const sizeSummary = {};
    for (const serial of master.serials) {
      const sz = serial.size || "unknown";
      if (!sizeSummary[sz]) {
        sizeSummary[sz] = { rTotal: 0, lTotal: 0, rReceived: 0, lReceived: 0 };
      }
      const qty = serial.sideQty || 0;
      const received = serial.receivedSideQty || 0;
      if (serial.side === "R") {
        sizeSummary[sz].rTotal += qty;
        sizeSummary[sz].rReceived += received;
      } else if (serial.side === "L") {
        sizeSummary[sz].lTotal += qty;
        sizeSummary[sz].lReceived += received;
      } else {
        // legacy serials without side: treat as right
        sizeSummary[sz].rTotal += qty || 1;
        if (serial.isReceived) sizeSummary[sz].rReceived += qty || 1;
      }
    }

    for (const entry of sizeReceived) {
      const { size } = entry;
      const info = sizeSummary[size];
      if (!info) {
        const error = new CustomError(`Size ${size} not found in this PO`);
        error.statusCode = 400;
        throw error;
      }

      const rightReceived = Number(entry.rightReceived ?? 0);
      const leftReceived = Number(entry.leftReceived ?? 0);
      const legacyQty = Number(entry.receivedQty ?? 0);

      if (rightReceived < 0 || leftReceived < 0 || legacyQty < 0) {
        const error = new CustomError(`Received quantity cannot be negative for size ${size}`);
        error.statusCode = 400;
        throw error;
      }

      // Validate: total requested cannot exceed total planned
      if (rightReceived > info.rTotal) {
        const error = new CustomError(
          `Cannot receive ${rightReceived} right for size ${size} — only ${info.rTotal} planned`
        );
        error.statusCode = 400;
        throw error;
      }
      if (leftReceived > info.lTotal) {
        const error = new CustomError(
          `Cannot receive ${leftReceived} left for size ${size} — only ${info.lTotal} planned`
        );
        error.statusCode = 400;
        throw error;
      }
      // Legacy single-qty path: cap at total units for the size
      if (legacyQty > info.rTotal + info.lTotal) {
        const error = new CustomError(
          `Cannot receive ${legacyQty} for size ${size} — only ${info.rTotal + info.lTotal} units planned`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const updated = await ControlSerialMasterModel.receiveWithQty(id, sizeReceived);

    res.status(200).json(
      generateResponse(200, true, "PO received successfully", {
        master: updated,
        receivedStatus: updated.receivedStatus,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET ALL (LEGACY flat view) — GET /api/controlSerials
// ═══════════════════════════════════════════════════════════════════════════
exports.getControlSerials = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || null;
    const poNumber = req.query.poNumber || null;
    const itemCode = req.query.itemCode || null;
    const supplierId = req.query.supplierId || null;
    const size = req.query.size || null;

    let isArchived = null;
    if (req.query.isArchived === "true") isArchived = true;
    else if (req.query.isArchived !== undefined && req.query.isArchived !== null) isArchived = false;

    const result = await ControlSerialModel.findAllWithPagination(
      page, limit, search, poNumber, itemCode, supplierId, isArchived, size
    );
    const { controlSerials, pagination } = result;

    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError("No control serials found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json(
      generateResponse(200, true, "Control serials retrieved successfully", { controlSerials, pagination })
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllControlSerials = async (req, res, next) => {
  try {
    const result = await ControlSerialModel.findAll();
    if (!result || result.length === 0) {
      const error = new CustomError("No control serials found");
      error.statusCode = 404;
      return next(error);
    }
    res.status(200).json(generateResponse(200, true, "Control serials retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

exports.getControlSerialById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const controlSerial = await ControlSerialModel.findById(id);
    if (!controlSerial) {
      const error = new CustomError("Control serial not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(generateResponse(200, true, "Control serial retrieved successfully", controlSerial));
  } catch (error) {
    next(error);
  }
};

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
      const error = new CustomError("No control serials found for the given ItemCode");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(generateResponse(200, true, "Control serials retrieved successfully", controlSerials));
  } catch (error) {
    next(error);
  }
};

exports.searchBySerialNumber = async (req, res, next) => {
  try {
    const { serialNumber } = req.query;
    if (!serialNumber) {
      const error = new CustomError("serialNumber query parameter is required");
      error.statusCode = 400;
      throw error;
    }
    const controlSerial = await ControlSerialModel.findBySerialNumber(serialNumber);
    if (!controlSerial) {
      const error = new CustomError("No control serial found with the given serial number");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(generateResponse(200, true, "Control serial retrieved successfully", controlSerial));
  } catch (error) {
    next(error);
  }
};

exports.searchByPoNumber = async (req, res, next) => {
  try {
    const { poNumber, size } = req.query;
    if (!poNumber) {
      const error = new CustomError("poNumber query parameter is required");
      error.statusCode = 400;
      throw error;
    }
    const controlSerials = await ControlSerialModel.findByPoNumber(poNumber, false, size);
    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError("No control serials found for the given PO number");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(generateResponse(200, true, "Control serials retrieved successfully", controlSerials));
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEND BY PO — POST /api/controlSerials/send-by-po
// ═══════════════════════════════════════════════════════════════════════════
exports.sendControlSerialsByPoNumber = async (req, res, next) => {
  try {
    const { poNumber } = req.body;
    if (!poNumber) {
      const error = new CustomError("PO number is required");
      error.statusCode = 400;
      throw error;
    }

    // Find ALL masters for this PO to handle consolidated sending
    const masters = await prisma.controlSerialMaster.findMany({
      where: { poNumber },
      include: { product: true, supplier: true, serials: true },
    });

    if (!masters || masters.length === 0) {
      const error = new CustomError("No control serial master found for this PO number");
      error.statusCode = 404;
      throw error;
    }

    // Check if at least one master is unsent
    const unsentMasters = masters.filter(m => !m.isSentToSupplier);
    if (unsentMasters.length === 0) {
      const error = new CustomError("Already sent all control serials to supplier for this PO number");
      error.statusCode = 400;
      throw error;
    }

    // Use the first master to get supplier info (assuming one supplier per PO)
    const supplier = masters[0].supplier;
    if (!supplier) {
      const error = new CustomError("Supplier not found for this PO");
      error.statusCode = 404;
      throw error;
    }

    const baseUrl = process.env.FRONTEND_URL;
    
    // Consolidate serials from all masters for this PO
    const allSerials = masters.flatMap(m => m.serials || []);
    const uniqueItemCodes = [...new Set(masters.map(m => m.product?.ItemCode).filter(Boolean))];
    const sizeSummary = buildSizeSummaryFromSerials(allSerials);
    const totalQty = allSerials.length;

    await sendControlSerialNotificationEmail({
      supplierEmail: supplier.email,
      supplierName: supplier.name,
      poNumber,
      itemCode: uniqueItemCodes.join(", "),
      quantity: totalQty,
      size: sizeSummary.map((s) => s.size).join(", "),
      baseUrl,
    });

    // Mark all children + ALL masters for this PO as sent
    const serialIds = allSerials.map((s) => s.id);
    await ControlSerialModel.markAsSentByIds(serialIds);
    
    await prisma.controlSerialMaster.updateMany({
      where: { poNumber },
      data: { isSentToSupplier: true }
    });

    // Fire SENT_TO_SUPPLIER events (non-blocking)
    const sentSerialNumbers = allSerials.map((s) => s.serialNumber).filter(Boolean);
    fireSerialEvents(
      sentSerialNumbers,
      "SENT_TO_SUPPLIER",
      `Sent to supplier: ${supplier.name} (${supplier.email})`,
      { poNumber, supplierName: supplier.name, supplierEmail: supplier.email }
    ); // intentionally not awaited

    res.status(200).json(
      generateResponse(200, true, "Control serials sent to supplier successfully", {
        poNumber,
        supplierId: supplier.id,
        supplierEmail: supplier.email,
        quantity: totalQty,
        mastersUpdated: masters.length
      })
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE — PUT /api/controlSerials/:id
// ═══════════════════════════════════════════════════════════════════════════
exports.updateControlSerial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ItemCode, size, poNumber, supplierId, binLocationId, isSentToSupplier, isArchived } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new CustomError(errors.errors[0].msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const existingSerial = await ControlSerialModel.findById(id);
    if (!existingSerial) {
      const error = new CustomError("Control serial not found");
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};

    if (ItemCode && ItemCode !== existingSerial.product?.ItemCode) {
      const product = await ItemCodeModel.findByItemCode(ItemCode);
      if (!product) {
        const error = new CustomError("Product with given ItemCode not found");
        error.statusCode = 404;
        throw error;
      }
      updateData.ItemCode = product.id;
    }

    if (supplierId && supplierId !== existingSerial.supplierId) {
      const supplier = await SupplierModel.getSupplierById(supplierId);
      if (!supplier) {
        const error = new CustomError("Supplier not found");
        error.statusCode = 404;
        throw error;
      }
      updateData.supplierId = supplierId;
    }

    if (binLocationId !== undefined) {
      if (binLocationId === null) {
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

    if (size !== undefined) updateData.size = size;
    if (poNumber !== undefined) updateData.poNumber = poNumber;
    if (isSentToSupplier !== undefined) updateData.isSentToSupplier = isSentToSupplier;
    if (isArchived !== undefined) updateData.isArchived = isArchived;

    if (Object.keys(updateData).length === 0) {
      return res.status(200).json(generateResponse(200, true, "Control serial is already up to date", existingSerial));
    }

    const updatedSerial = await ControlSerialModel.update(id, updateData);
    res.status(200).json(generateResponse(200, true, "Control serial updated successfully", updatedSerial));
  } catch (error) {
    next(error);
  }
};

exports.updateSizeByPO = async (req, res, next) => {
  try {
    const { poNumber, oldSize, newSize } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new CustomError(errors.errors[0].msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }
    if (oldSize === newSize) {
      return res.status(200).json(generateResponse(200, true, "Old size and new size are the same. No update required.", null));
    }
    const result = await ControlSerialModel.updateByPoNumberAndSize(poNumber, oldSize, { size: newSize });
    if (result.count === 0) {
      const error = new CustomError("No control serials found for given PO number and old size");
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json(
      generateResponse(200, true, `Size updated successfully for ${result.count} record(s)`, {
        poNumber, oldSize, newSize, updatedCount: result.count,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DELETE — DELETE /api/controlSerials/:id
// ═══════════════════════════════════════════════════════════════════════════
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
    res.status(200).json(generateResponse(200, true, "Control serial deleted successfully", deletedSerial));
  } catch (error) {
    next(error);
  }
};

exports.bulkDeleteByPoNumber = async (req, res, next) => {
  try {
    const { poNumber, size } = req.body;
    if (!poNumber) {
      const error = new CustomError("PO number is required");
      error.statusCode = 400;
      throw error;
    }
    const normalizedSize = size && size.trim() !== "" ? size.trim() : null;
    const existingSerials = await ControlSerialModel.findByPoNumber(poNumber, true, normalizedSize);
    if (!existingSerials || existingSerials.length === 0) {
      const error = new CustomError(
        normalizedSize
          ? `No control serials found for PO number: ${poNumber} and size: ${normalizedSize}`
          : `No control serials found for PO number: ${poNumber}`
      );
      error.statusCode = 404;
      throw error;
    }
    const result = await ControlSerialModel.deleteByPoNumberAndSize(poNumber, normalizedSize);
    const message = normalizedSize
      ? `${result.count} control serial(s) deleted for PO: ${poNumber} and size: ${normalizedSize}`
      : `${result.count} control serial(s) deleted for PO: ${poNumber}`;
    res.status(200).json(generateResponse(200, true, message, { poNumber, size: normalizedSize, deletedCount: result.count }));
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PUT AWAY — PUT /api/controlSerials/put-away
// ═══════════════════════════════════════════════════════════════════════════
exports.putAway = async (req, res, next) => {
  try {
    const { poNumber, size, binLocationId } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new CustomError(errors.errors[0].msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const existingSerials = await ControlSerialModel.findByPoNumber(poNumber, true, size, false);
    if (!existingSerials || existingSerials.length === 0) {
      const error = new CustomError("No control serials found for the given PO number and size");
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};
    if (binLocationId !== undefined) {
      if (binLocationId === null) {
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

    if (Object.keys(updateData).length === 0) {
      const error = new CustomError("No update data provided");
      error.statusCode = 400;
      throw error;
    }

    const result = await ControlSerialModel.updateByPoNumberAndSize(poNumber, size, updateData);
    res.status(200).json(generateResponse(200, true, `${result.count} control serial(s) updated successfully`, result));
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MARK AS RECEIVED (legacy/bulk) — PUT /api/controlSerials/receive-po
// ═══════════════════════════════════════════════════════════════════════════
exports.markAsReceived = async (req, res, next) => {
  try {
    const { poNumber, size, isReceived } = req.body;
    if (!poNumber) {
      const error = new CustomError("PO number is required");
      error.statusCode = 400;
      throw error;
    }
    const receivedStatus = isReceived !== undefined ? isReceived : true;
    const result = await ControlSerialModel.updateByPoNumberAndSize(poNumber, size, { isReceived: receivedStatus });
    if (result.count === 0) {
      const error = new CustomError("No control serials found for the given PO number" + (size ? " and size" : ""));
      error.statusCode = 404;
      throw error;
    }

    // Also update master receivedStatus
    const master = await ControlSerialMasterModel.findByPoNumber(poNumber);
    if (master) {
      const allSerials = await ControlSerialModel.findByMasterId(master.id);
      const total = allSerials.length;
      const received = allSerials.filter((s) => s.isReceived).length;
      const newStatus = received === 0 ? "pending" : received >= total ? "received" : "partial";
      await ControlSerialMasterModel.update(master.id, { receivedStatus: newStatus });

      // Fire RECEIVED events (non-blocking) for serials that are now received
      const nowReceivedSerials = allSerials
        .filter((s) => s.isReceived && s.serialNumber)
        .map((s) => s.serialNumber);
      if (nowReceivedSerials.length > 0) {
        fireSerialEvents(
          nowReceivedSerials,
          "RECEIVED",
          `Received at warehouse for PO ${poNumber}`,
          { poNumber, size: size || null }
        ); // intentionally not awaited
      }
    }

    res.status(200).json(
      generateResponse(200, true, `${result.count} control serial(s) marked as received successfully`, result)
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ARCHIVE / UNARCHIVE — POST /api/controlSerials/archive/by-po & /unarchive/by-po
// ═══════════════════════════════════════════════════════════════════════════
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
    const controlSerials = await ControlSerialModel.findByPoNumber(poNumber, false, size);
    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError("No control serials found for the given PO number");
      error.statusCode = 404;
      throw error;
    }
    const result = await ControlSerialModel.archiveByPoNumber(poNumber, size);
    if (result.count === 0) {
      const error = new CustomError("Failed to archive control serials");
      error.statusCode = 500;
      throw error;
    }
    res.status(200).json(
      generateResponse(200, true, `${result.count} control serial(s) archived for PO: ${poNumber}`, { poNumber, archivedCount: result.count })
    );
  } catch (error) {
    next(error);
  }
};

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
    const controlSerials = await ControlSerialModel.findByPoNumber(poNumber, false, size);
    if (!controlSerials || controlSerials.length === 0) {
      const error = new CustomError("No control serials found for the given PO number");
      error.statusCode = 404;
      throw error;
    }
    const archivedSerials = controlSerials.filter((s) => s.isArchived);
    if (archivedSerials.length === 0) {
      const error = new CustomError("No archived control serials found for the given PO number");
      error.statusCode = 404;
      throw error;
    }
    const result = await ControlSerialModel.unarchiveByPoNumber(poNumber, size);
    if (result.count === 0) {
      const error = new CustomError("Failed to unarchive control serials");
      error.statusCode = 500;
      throw error;
    }
    res.status(200).json(
      generateResponse(200, true, `${result.count} control serial(s) unarchived for PO: ${poNumber}`, { poNumber, unarchivedCount: result.count })
    );
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PO NUMBERS ENDPOINTS (used by frontend screens)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/controlSerials/po-numbers-with-total-qty
 * Used by PoNumberTable.jsx — returns master-level view
 */
exports.getUniquePONumbersWithTotalQty = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const isArchived =
      req.query.isArchived !== undefined ? req.query.isArchived === "true" : null;
    const supplierId = req.query.supplierId || null;

    const result = await ControlSerialModel.getUniquePONumbersWithTotalQty(
      isArchived,
      supplierId,
      page,
      limit
    );

    res.status(200).json(
      generateResponse(200, true, "Unique PO numbers with total quantities retrieved successfully", {
        data: result.masters,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/controlSerials/po-numbers
 * Used by SLIC admin
 */
exports.getPoNumbersWithSupplierDetails = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const itemCode = req.query.itemCode || null;
    const size = req.query.size || null;
    const isArchived = req.query.isArchived !== undefined ? req.query.isArchived === "true" : null;
    const hasPutAway = req.query.hasPutAway !== undefined ? req.query.hasPutAway === "true" : null;

    const result = await ControlSerialModel.getPoNumbersWithSupplierDetails(
      itemCode,
      size,
      isArchived,
      hasPutAway,
      page,
      limit
    );

    res.status(200).json(
      generateResponse(200, true, "PO numbers with details retrieved successfully", {
        data: result.masters,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/controlSerials/supplier/po-numbers
 * Supplier portal — only shows POs sent to this supplier
 */
exports.getSupplierPoNumbersWithSupplierDetails = async (req, res, next) => {
  try {
    const supplierEmail = req?.email;
    if (!supplierEmail) {
      const error = new CustomError("Supplier email not found in token");
      error.statusCode = 401;
      throw error;
    }
    const supplier = await SupplierModel.getSupplierByEmail(supplierEmail);
    if (!supplier) {
      const error = new CustomError("Supplier not found");
      error.statusCode = 404;
      throw error;
    }

    const poList = await ControlSerialModel.getPoNumbersWithSupplierDetailsBySupplierId(supplier.id);

    res.status(200).json(
      generateResponse(200, true, "PO numbers with supplier details retrieved successfully", poList)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/controlSerials/po-details?poNumber=value
 */
exports.getControlSerialDetailsByPONumber = async (req, res, next) => {
  try {
    const { poNumber } = req.query;
    if (!poNumber) {
      const error = new CustomError("poNumber query parameter is required");
      error.statusCode = 400;
      throw error;
    }

    const sizeSummary = await ControlSerialModel.getSizeSummaryByPoNumber(poNumber);
    if (!sizeSummary || sizeSummary.length === 0) {
      const error = new CustomError("No control serials found for the given PO number");
      error.statusCode = 404;
      throw error;
    }

    const allRecords = await ControlSerialModel.getControlSerialsByPONumberGroupedBySize(poNumber);
    const totalQty = sizeSummary.reduce((sum, item) => sum + item.qty, 0);

    // Also get master record if exists
    const master = await ControlSerialMasterModel.findByPoNumber(poNumber);

    res.status(200).json(
      generateResponse(200, true, "Control serial details retrieved successfully", {
        poNumber,
        totalQty,
        sizeSummary,
        records: allRecords,
        master: master ? {
          id: master.id,
          isSentToSupplier: master.isSentToSupplier,
          receivedStatus: master.receivedStatus,
          isArchived: master.isArchived,
        } : null,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ─── Internal Helper ──────────────────────────────────────────────────────────
function buildSizeSummaryFromSerials(serials = []) {
  const map = {};
  for (const s of serials) {
    const sz = s.size || "unknown";
    if (!map[sz]) map[sz] = { size: sz, total: 0, received: 0 };
    map[sz].total += 1;
    if (s.isReceived) map[sz].received += 1;
  }
  return Object.values(map);
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE SSCCs FOR PRINT — POST /api/controlSerials/generate-ssccs
// Body: { count: number }
// Returns an array of `count` unique GS1 SSCC-18 strings.
// Uses TblBarSeriesNo row 1 as the persistent sequential counter.
// ═══════════════════════════════════════════════════════════════════════════
exports.generateSSCCsForPrint = async (req, res, next) => {
  try {
    const count = parseInt(req.body.count, 10);
    if (!count || count <= 0 || count > 1000) {
      const error = new CustomError("count must be a positive integer (max 1000)");
      error.statusCode = 400;
      throw error;
    }

    // Atomically fetch-and-increment the counter using a transaction
    const ssccs = await prisma.$transaction(async (tx) => {
      // Upsert row 1 — seed to 1 if it doesn't exist or ssccSeriesNo is null
      let row = await tx.tblBarSeriesNo.findUnique({ where: { TblSysNoID: 1 } });

      if (!row) {
        row = await tx.tblBarSeriesNo.create({
          data: { TblSysNoID: 1, BarSeriesNo: "1", ssccSeriesNo: 1 },
        });
      } else if (row.ssccSeriesNo === null || row.ssccSeriesNo === undefined) {
        row = await tx.tblBarSeriesNo.update({
          where: { TblSysNoID: 1 },
          data: { ssccSeriesNo: 1 },
        });
      }

      const startSeq = row.ssccSeriesNo;

      // Increment by count
      await tx.tblBarSeriesNo.update({
        where: { TblSysNoID: 1 },
        data: { ssccSeriesNo: { increment: count } },
      });

      // Build the SSCCs
      const result = [];
      for (let i = 0; i < count; i++) {
        const seq = String(startSeq + i).padStart(9, "0");
        result.push(buildSSCC(seq));
      }
      return result;
    });

    return res.status(200).json(
      generateResponse(200, true, `${count} SSCC(s) generated`, { ssccs, count })
    );
  } catch (error) {
    next(error);
  }
};
