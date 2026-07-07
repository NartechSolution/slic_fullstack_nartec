/**
 * Digital Link Controller
 * =======================
 * Public API — no auth required.
 * Returns full product + supply chain traceability data for a given serial number or GTIN.
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

    const identifier = serialNumber.trim();

    // 1. Find the control serial (child record) with product + supplier + master
    const serial = await prisma.controlSerial.findFirst({
      where: { serialNumber: identifier },
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
      // Try GTIN or ItemCode lookup → product-level response
      const productFound = await prisma.tblItemCodes1S1Br.findFirst({
        where: {
          OR: [
            { GTIN: identifier },
            { ItemCode: identifier },
          ],
        },
      });

      if (!productFound) {
        const err = new CustomError(`No serial or product found for: ${identifier}`);
        err.statusCode = 404;
        throw err;
      }

      // ── Enrich product-level response with supply chain data ──────────────
      // 1. Get ALL related products sharing same GTIN or ItemCode across all sizes
      const allRelatedProducts = await prisma.tblItemCodes1S1Br.findMany({
        where: {
          OR: [
            { GTIN: identifier },
            { ItemCode: identifier },
            { ItemCode: productFound.ItemCode || "" },
          ],
        },
        select: { id: true, ItemCode: true },
      });

      const allProductIds = allRelatedProducts.map((p) => p.id);
      const allItemCodeStrings = [...new Set(allRelatedProducts.map((p) => p.ItemCode).filter(Boolean))];

      const [
        controlMasters,
        serialStats,
        mergeRecords,
        salesHistory,
      ] = await Promise.all([
        // All PO masters for this product line (all sizes)
        prisma.controlSerialMaster.findMany({
          where: { productId: { in: allProductIds } },
          include: { supplier: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),

        // Aggregate serial stats for entire product line
        prisma.controlSerial.groupBy({
          by: ["isReceived", "isSentToSupplier"],
          where: { ItemCode: { in: allProductIds } },
          _count: { id: true },
        }),

        // Merge records for this GTIN / itemCode group
        prisma.mergeRecord.findMany({
          where: {
            OR: [
              { gtin: identifier },
              { itemCode: { in: allItemCodeStrings } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),

        // POS Sales — latest invoices for this item code group
        prisma.tblPOSInvoiceDetails.findMany({
          where: { ItemSKU: { in: allItemCodeStrings } },
          orderBy: { TransactionDate: "desc" },
          take: 10,
          select: {
            InvoiceNo: true,
            TransactionDate: true,
            ItemSize: true,
            ItemQry: true,
            ItemPrice: true,
            ITEMRATE: true,
            CustomerCode: true,
            SalesLocationCode: true,
          },
        }),
      ]);

      // ── Build serial statistics ───────────────────────────────────────────
      let totalSerials = 0;
      let totalSent = 0;
      let totalReceived = 0;

      for (const group of serialStats) {
        const count = group._count.id;
        totalSerials += count;
        if (group.isSentToSupplier) totalSent += count;
        if (group.isReceived) totalReceived += count;
      }

      // ── Build supply chain timeline ───────────────────────────────────────
      const timeline = [];

      // PO creation events from masters
      const sortedMasters = [...controlMasters].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      if (sortedMasters.length > 0) {
        const firstMaster = sortedMasters[0];
        timeline.push({
          eventType: "PO_CREATED",
          title: "Purchase Order Created",
          description: `PO ${firstMaster.poNumber} created for supplier${firstMaster.supplier?.name ? ` ${firstMaster.supplier.name}` : ""}`,
          occurredAt: firstMaster.createdAt,
          metadata: {
            poNumber: firstMaster.poNumber,
            supplier: firstMaster.supplier?.name || null,
          },
        });
      }

      // Sent to supplier event
      const sentMasters = controlMasters.filter((m) => m.isSentToSupplier);
      if (sentMasters.length > 0) {
        const supplier = sentMasters[0].supplier;
        timeline.push({
          eventType: "SENT_TO_SUPPLIER",
          title: "Sent to Supplier",
          description: `Serial numbers sent to supplier${supplier?.name ? ` (${supplier.name})` : ""}`,
          occurredAt: sentMasters[0].updatedAt,
          metadata: { supplier: supplier?.name || null },
        });
      }

      // Received event
      const receivedMasters = controlMasters.filter(
        (m) => m.receivedStatus === "received" || m.receivedStatus === "partial"
      );
      if (receivedMasters.length > 0) {
        timeline.push({
          eventType: "RECEIVED",
          title: "Items Received",
          description: `Items received at warehouse (${receivedMasters[0].receivedStatus})`,
          occurredAt: receivedMasters[0].updatedAt,
          metadata: { status: receivedMasters[0].receivedStatus },
        });
      }

      // Merge events
      if (mergeRecords.length > 0) {
        timeline.push({
          eventType: "MERGED",
          title: "Paired & Finished Goods Created",
          description: `${mergeRecords.length} pair(s) merged into finished goods`,
          occurredAt: mergeRecords[0].createdAt,
          metadata: { mergeCount: mergeRecords.length },
        });
      }

      // Sales event
      if (salesHistory.length > 0) {
        timeline.push({
          eventType: "SOLD",
          title: "Product Sold at POS",
          description: `Latest sale: Invoice ${salesHistory[0].InvoiceNo}`,
          occurredAt: salesHistory[0].TransactionDate,
          metadata: {
            invoiceNo: salesHistory[0].InvoiceNo,
            location: salesHistory[0].SalesLocationCode,
          },
        });
      }

      // Sort timeline chronologically
      timeline.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

      // ── Unique PO numbers ─────────────────────────────────────────────────
      const poNumbers = [
        ...new Set(controlMasters.map((m) => m.poNumber).filter(Boolean)),
      ];

      // ── Unique suppliers ─────────────────────────────────────────────────
      const suppliersMap = new Map();
      for (const m of controlMasters) {
        if (m.supplier && !suppliersMap.has(m.supplier.id)) {
          suppliersMap.set(m.supplier.id, m.supplier);
        }
      }
      const suppliers = Array.from(suppliersMap.values());

      // ── Total sales qty from POS ──────────────────────────────────────────
      const totalSalesQty = salesHistory.reduce(
        (sum, s) => sum + (s.ItemQry || 0),
        0
      );

      const productResponse = {
        serialNumber: identifier,
        isProductLevel: true,

        // Product Identity
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
          label: productFound.label || null,
          packagingType: productFound.PackagingType || null,
          productType: productFound.ProductType || null,
          productUnit: productFound.ProductUnit || null,
          image: productFound.image || null,
          productionDate: productFound.ProductionDate || null,
          lotNo: productFound.LotNo || null,
          expiryDate: productFound.ExpiryDate || null,
          whLocation: productFound.WHLocation || null,
        },

        // Supply Chain Statistics
        stats: {
          totalSerials,
          totalSent,
          totalReceived,
          totalMerged: mergeRecords.length,
          totalSoldQty: totalSalesQty,
          totalPOs: poNumbers.length,
        },

        // PO Information
        po: {
          poNumbers,
          masterCount: controlMasters.length,
          mostRecentPO: sortedMasters[sortedMasters.length - 1]?.poNumber || null,
        },

        // Suppliers involved
        suppliers: suppliers.map((s) => ({
          name: s.name || null,
          email: s.email || null,
          status: s.status || null,
        })),

        // Merge / Finished Goods
        mergeRecords: mergeRecords.map((m) => ({
          fgSerial: m.fgSerial,
          size: m.size,
          mergedBy: m.mergedBy,
          mergedAt: m.createdAt,
        })),

        // POS Sales History
        salesHistory: salesHistory.map((s) => ({
          invoiceNo: s.InvoiceNo,
          transactionDate: s.TransactionDate,
          size: s.ItemSize,
          qty: s.ItemQry,
          unitPrice: s.ITEMRATE || s.ItemPrice,
          customerCode: s.CustomerCode,
          location: s.SalesLocationCode,
        })),

        // Supply Chain Timeline
        timeline,

        // Timestamps
        createdAt: productFound.Created_at,
        updatedAt: productFound.Updated_at,
      };

      return res.status(200).json(
        generateResponse(200, true, "Product supply chain data retrieved successfully", productResponse)
      );
    }

    // ── Serial-level path (specific serialNumber found) ────────────────────

    // 2. Fetch all lifecycle events for this serial (oldest → newest)
    const events = await prisma.serialEvent.findMany({
      where: { serialNumber: identifier },
      orderBy: { occurredAt: "asc" },
    });

    // 3. Check if this serial has been merged (FG created)
    const merge = await prisma.mergeRecord.findFirst({
      where: {
        OR: [{ serial1: identifier }, { serial2: identifier }],
      },
    });

    // 4. Build the structured response
    const product = serial.product;
    const supplier = serial.supplier || serial.master?.supplier;

    // 5. Pull sibling serials count from same PO
    const [siblingCount, totalSalesForProduct] = await Promise.all([
      serial.poNumber
        ? prisma.controlSerial.count({
            where: { poNumber: serial.poNumber },
          })
        : Promise.resolve(0),

      product
        ? prisma.tblPOSInvoiceDetails.count({
            where: { ItemSKU: product.ItemCode || undefined },
          })
        : Promise.resolve(0),
    ]);

    const response = {
      serialNumber: serial.serialNumber,
      isProductLevel: false,

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
        label: product?.label || null,
        packagingType: product?.PackagingType || null,
        productType: product?.ProductType || null,
        productUnit: product?.ProductUnit || null,
        image: product?.image || null,
        productionDate: product?.ProductionDate || null,
        lotNo: product?.LotNo || null,
        expiryDate: product?.ExpiryDate || null,
      },

      // Supplier + PO Info
      po: {
        poNumber: serial.poNumber || serial.master?.poNumber || null,
        supplierName: supplier?.name || null,
        supplierEmail: supplier?.email || null,
        receivedStatus: serial.master?.receivedStatus || null,
        isSentToSupplier: serial.isSentToSupplier || false,
        isReceived: serial.isReceived || false,
        siblingSerialsInPO: siblingCount,
      },

      // Bin / Warehouse
      location: serial.binLocation
        ? {
            binNumber: serial.binLocation.binNumber || null,
            zoneName: serial.binLocation.zoneName || null,
            groupWarehouse: serial.binLocation.groupWarehouse || null,
            gln: serial.binLocation.gln || null,
          }
        : null,

      // Merge record (if this serial has been paired into an FG)
      merge: merge
        ? {
            fgSerial: merge.fgSerial,
            pairedWith: merge.serial1 === identifier ? merge.serial2 : merge.serial1,
            size: merge.size,
            mergedBy: merge.mergedBy,
            mergedAt: merge.createdAt,
          }
        : null,

      // Stats
      stats: {
        totalSerials: siblingCount,
        totalSoldQty: totalSalesForProduct,
        isMerged: !!merge,
      },

      // Full supply chain timeline from events table
      timeline: events.map((e) => ({
        eventType: e.eventType,
        title: eventTypeToTitle(e.eventType),
        description: e.description,
        occurredAt: e.occurredAt,
        performedBy: e.performedBy,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
      })),

      // Timestamps
      createdAt: serial.createdAt,
      updatedAt: serial.updatedAt,
    };

    // 6. If no events exist yet, synthesise a minimal timeline from serial flags
    if (events.length === 0) {
      const syntheticTimeline = [];

      syntheticTimeline.push({
        eventType: "CREATED",
        title: "Serial Number Created",
        description: `Serial created for PO ${serial.poNumber || "N/A"}`,
        occurredAt: serial.createdAt,
        performedBy: "System",
        metadata: { poNumber: serial.poNumber, itemCode: product?.ItemCode },
      });

      if (serial.isSentToSupplier) {
        syntheticTimeline.push({
          eventType: "SENT_TO_SUPPLIER",
          title: "Sent to Supplier",
          description: `Sent to supplier: ${supplier?.name || "N/A"}`,
          occurredAt: serial.updatedAt,
          performedBy: "System",
          metadata: { supplier: supplier?.name },
        });
      }

      if (serial.isReceived) {
        syntheticTimeline.push({
          eventType: "RECEIVED",
          title: "Received at Warehouse",
          description: "Serial received and confirmed at warehouse",
          occurredAt: serial.updatedAt,
          performedBy: "System",
          metadata: null,
        });
      }

      if (serial.binLocation) {
        syntheticTimeline.push({
          eventType: "PUT_AWAY",
          title: "Put Away in Warehouse",
          description: `Stored in bin ${serial.binLocation.binNumber}`,
          occurredAt: serial.updatedAt,
          performedBy: "System",
          metadata: { binNumber: serial.binLocation.binNumber },
        });
      }

      if (merge) {
        syntheticTimeline.push({
          eventType: "MERGED",
          title: "Merged into Finished Good",
          description: `Paired → FG: ${merge.fgSerial}`,
          occurredAt: merge.createdAt,
          performedBy: merge.mergedBy || "System",
          metadata: { fgSerial: merge.fgSerial },
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function eventTypeToTitle(eventType) {
  const map = {
    CREATED: "Serial Number Created",
    SENT_TO_SUPPLIER: "Sent to Supplier",
    RECEIVED: "Received at Warehouse",
    PUT_AWAY: "Put Away in Warehouse",
    MERGED: "Merged into Finished Good",
    SOLD: "Sold at POS",
  };
  return map[eventType] || eventType;
}
