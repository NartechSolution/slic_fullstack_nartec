/**
 * Digital Link Controller
 * =======================
 * Public API — no auth required.
 * Returns full product + supply chain traceability data for a given serial number.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const generateResponse = require("../utils/response");
const CustomError = require("../exceptions/customError");

// ─── GET /api/digital-link/:serialNumber ────────────────────────────────────
exports.getDigitalLink = async (req, res, next) => {
  try {
    const { serialNumber } = req.params;

    if (!serialNumber?.trim()) {
      const err = new CustomError("Serial number is required");
      err.statusCode = 400;
      throw err;
    }

    // 1. Find the control serial (child record) with product + supplier + master
    const serial = await prisma.controlSerial.findFirst({
      where: { serialNumber: serialNumber.trim() },
      include: {
        product: true,
        supplier: true,
        master: {
          include: { supplier: true },
        },
        binLocation: true,
      },
    });

    if (!serial) {
      // It might be a product barcode (GTIN) or ItemCode instead of a serial number
      const productFound = await prisma.tblItemCodes1S1Br.findFirst({
        where: {
          OR: [
            { GTIN: serialNumber.trim() },
            { ItemCode: serialNumber.trim() }
          ]
        }
      });

      if (!productFound) {
        const err = new CustomError(`No serial or product found for: ${serialNumber}`);
        err.statusCode = 404;
        throw err;
      }

      // Return product-only response without timeline
      const productResponse = {
        serialNumber: serialNumber,
        isProductLevel: true, // Help frontend distinguish
        product: {
          itemCode: productFound.ItemCode || null,
          englishName: productFound.EnglishName || null,
          arabicName: productFound.ArabicName || null,
          gtin: productFound.GTIN || null,
          size: productFound.ProductSize || null,
          brandName: productFound.BrandName || null,
          modelName: productFound.ModelName || null,
          color: productFound.color || null,
          upper: productFound.upper || null,
          sole: productFound.sole || null,
          width: productFound.width || null,
          packagingType: productFound.PackagingType || null,
          productType: productFound.ProductType || null,
          image: productFound.image || null,
          productionDate: productFound.ProductionDate || null,
        },
        po: null,
        location: null,
        merge: null,
        timeline: [], // No timeline for a generic product
        createdAt: productFound.Created_at,
        updatedAt: productFound.Updated_at,
      };

      return res.status(200).json(
        generateResponse(200, true, "Product information retrieved successfully", productResponse)
      );
    }

    // 2. Fetch all lifecycle events for this serial (oldest → newest)
    const events = await prisma.serialEvent.findMany({
      where: { serialNumber: serialNumber.trim() },
      orderBy: { occurredAt: "asc" },
    });

    // 3. Check if this serial has been merged (FG created)
    const merge = await prisma.mergeRecord.findFirst({
      where: {
        OR: [{ serial1: serialNumber }, { serial2: serialNumber }],
      },
    });

    // 4. Build the structured response
    const product = serial.product;
    const supplier = serial.supplier || serial.master?.supplier;

    const response = {
      serialNumber: serial.serialNumber,

      // Product Information
      product: {
        itemCode: product?.ItemCode || null,
        englishName: product?.EnglishName || null,
        arabicName: product?.ArabicName || null,
        gtin: product?.GTIN || null,
        size: serial.size || product?.ProductSize || null,
        brandName: product?.BrandName || null,
        modelName: product?.ModelName || null,
        color: product?.color || null,
        upper: product?.upper || null,
        sole: product?.sole || null,
        width: product?.width || null,
        packagingType: product?.PackagingType || null,
        productType: product?.ProductType || null,
        image: product?.image || null,
        productionDate: product?.ProductionDate || null,
      },

      // Supplier + PO Info
      po: {
        poNumber: serial.poNumber || serial.master?.poNumber || null,
        supplierName: supplier?.name || null,
        supplierEmail: supplier?.email || null,
        receivedStatus: serial.master?.receivedStatus || null,
        isSentToSupplier: serial.isSentToSupplier || false,
        isReceived: serial.isReceived || false,
      },

      // Bin / Warehouse
      location: serial.binLocation
        ? {
            binNumber: serial.binLocation.binNumber || null,
            zoneName: serial.binLocation.zoneName || null,
            groupWarehouse: serial.binLocation.groupWarehouse || null,
          }
        : null,

      // Merge record (if this serial has been paired into an FG)
      merge: merge
        ? {
            fgSerial: merge.fgSerial,
            pairedWith: merge.serial1 === serialNumber ? merge.serial2 : merge.serial1,
            mergedAt: merge.createdAt,
          }
        : null,

      // Full supply chain timeline from events table
      timeline: events.map((e) => ({
        eventType: e.eventType,
        description: e.description,
        occurredAt: e.occurredAt,
        performedBy: e.performedBy,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
      })),

      // Timestamps
      createdAt: serial.createdAt,
      updatedAt: serial.updatedAt,
    };

    // 5. If no events exist yet, synthesise a minimal timeline from serial flags
    if (events.length === 0) {
      const syntheticTimeline = [];

      syntheticTimeline.push({
        eventType: "CREATED",
        description: `Serial created for PO ${serial.poNumber || "N/A"}`,
        occurredAt: serial.createdAt,
        performedBy: "System",
        metadata: { poNumber: serial.poNumber, itemCode: product?.ItemCode },
      });

      if (serial.isSentToSupplier) {
        syntheticTimeline.push({
          eventType: "SENT_TO_SUPPLIER",
          description: `Sent to supplier: ${supplier?.name || "N/A"}`,
          occurredAt: serial.updatedAt,
          performedBy: "System",
          metadata: { supplier: supplier?.name },
        });
      }

      if (serial.isReceived) {
        syntheticTimeline.push({
          eventType: "RECEIVED",
          description: "Received at warehouse",
          occurredAt: serial.updatedAt,
          performedBy: "System",
          metadata: null,
        });
      }

      if (serial.binLocation) {
        syntheticTimeline.push({
          eventType: "PUT_AWAY",
          description: `Put away to bin ${serial.binLocation.binNumber}`,
          occurredAt: serial.updatedAt,
          performedBy: "System",
          metadata: { binNumber: serial.binLocation.binNumber },
        });
      }

      response.timeline = syntheticTimeline;
    }

    res.status(200).json(
      generateResponse(200, true, "Digital link data retrieved successfully", response)
    );
  } catch (error) {
    next(error);
  }
};
