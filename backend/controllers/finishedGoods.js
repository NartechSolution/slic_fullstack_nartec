/**
 * Finished Goods Controller
 * =========================
 * Reads over MergeRecord (+ ControlSerial + product) to expose a dedicated
 * Finished Goods API for the warehouse/production UI.
 *
 * A "Finished Good" is one unit (pair) of a ControlSerial turned into an FG
 * barcode. Each MergeRecord = 1 finished pair. Older records paired two
 * serials; new ones store the same serial in serial1 and serial2.
 *
 * Endpoints:
 *   GET /api/finished-goods              — paginated list with filters
 *   GET /api/finished-goods/stats        — dashboard counters
 *   GET /api/finished-goods/grouped      — grouped by product + size (for the FG screen card view)
 *   GET /api/finished-goods/:fgSerial    — full trace (source serial(s) + full history)
 *
 * Endpoints are read-only — actual FG creation goes through the existing
 * /api/merge-serial/merge endpoint.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const generateResponse = require("../utils/response");
const CustomError = require("../exceptions/customError");

// Unique source serial(s) of a MergeRecord
const fgSerialNumbers = (r) => [...new Set([r.serial1, r.serial2].filter(Boolean))];

// ── GET /api/finished-goods ─────────────────────────────────────────────────
// Paginated, filterable list of finished goods (one row per FG serial).
exports.listFinishedGoods = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { poNumber, itemCode, size, search, from, to } = req.query;

    const where = {};
    if (poNumber) where.poNumber = { contains: poNumber };
    if (itemCode) where.itemCode = { contains: itemCode };
    if (size) where.size = size;
    if (search) {
      where.OR = [
        { fgSerial: { contains: search } },
        { serial1: { contains: search } },
        { serial2: { contains: search } },
        { itemCode: { contains: search } },
        { gtin: { contains: search } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, records] = await Promise.all([
      prisma.mergeRecord.count({ where }),
      prisma.mergeRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Enrich with product details in one batched query (avoid N+1)
    const itemCodesSet = new Set(records.map((r) => r.itemCode).filter(Boolean));
    const products = itemCodesSet.size
      ? await prisma.tblItemCodes1S1Br.findMany({
          where: { ItemCode: { in: [...itemCodesSet] } },
          select: {
            ItemCode: true,
            EnglishName: true,
            ArabicName: true,
            GTIN: true,
            image: true,
            color: true,
            upper: true,
            sole: true,
            width: true,
            ProductSize: true,
          },
        })
      : [];

    const productByCode = new Map();
    for (const p of products) {
      if (!productByCode.has(p.ItemCode)) productByCode.set(p.ItemCode, p);
    }

    const enriched = records.map((r) => {
      const product = productByCode.get(r.itemCode) || null;
      return {
        id: r.id,
        fgSerial: r.fgSerial,
        serialNumbers: fgSerialNumbers(r),
        poNumber: r.poNumber,
        itemCode: r.itemCode,
        itemName: product?.EnglishName || null,
        size: r.size,
        gtin: r.gtin,
        image: product?.image || null,
        color: product?.color || null,
        mergedBy: r.mergedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return res.status(200).json(
      generateResponse(200, true, "Finished goods retrieved", {
        rows: enriched,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

// ── GET /api/finished-goods/stats ───────────────────────────────────────────
// Returns dashboard counters.
exports.getFinishedGoodsStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);

    const [total, todayCount, weekCount, distinctItems] = await Promise.all([
      prisma.mergeRecord.count(),
      prisma.mergeRecord.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.mergeRecord.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.mergeRecord.findMany({
        distinct: ["itemCode"],
        select: { itemCode: true },
      }),
    ]);

    return res.status(200).json(
      generateResponse(200, true, "Finished goods stats", {
        totalFG: total,
        todayFG: todayCount,
        last7DaysFG: weekCount,
        uniqueProducts: distinctItems.filter((d) => d.itemCode).length,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ── GET /api/finished-goods/grouped ─────────────────────────────────────────
// Aggregated view: grouped by (itemCode + size) with barcode counts.
// Used by the FinishedGoods.jsx card view.
exports.getFinishedGoodsGrouped = async (req, res, next) => {
  try {
    const { search, from, to, size } = req.query;

    const where = {};
    if (size) where.size = size;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { itemCode: { contains: search } },
        { fgSerial: { contains: search } },
        { gtin: { contains: search } },
      ];
    }

    const all = await prisma.mergeRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fgSerial: true,
        serial1: true,
        serial2: true,
        itemCode: true,
        size: true,
        gtin: true,
        createdAt: true,
      },
    });

    // Group by itemCode + size
    const groups = new Map();
    for (const r of all) {
      const key = `${r.itemCode || "NO_CODE"}__${r.size || "NO_SIZE"}`;
      if (!groups.has(key)) {
        groups.set(key, {
          itemCode: r.itemCode || "UNKNOWN",
          size: r.size || "—",
          gtin: r.gtin || null,
          count: 0,
          latestAt: r.createdAt,
          barcodes: [],
        });
      }
      const g = groups.get(key);
      g.count += 1;
      if (r.createdAt > g.latestAt) g.latestAt = r.createdAt;
      g.barcodes.push({
        id: r.id,
        fgSerial: r.fgSerial,
        serialNumbers: fgSerialNumbers(r),
        createdAt: r.createdAt,
      });
    }

    // Enrich with product info
    const itemCodesSet = new Set([...groups.values()].map((g) => g.itemCode));
    const products = itemCodesSet.size
      ? await prisma.tblItemCodes1S1Br.findMany({
          where: { ItemCode: { in: [...itemCodesSet] } },
          select: {
            ItemCode: true,
            EnglishName: true,
            ArabicName: true,
            GTIN: true,
            image: true,
            color: true,
          },
        })
      : [];

    const productByCode = new Map();
    for (const p of products) {
      if (!productByCode.has(p.ItemCode)) productByCode.set(p.ItemCode, p);
    }

    const rows = [...groups.values()]
      .map((g) => {
        const product = productByCode.get(g.itemCode);
        return {
          ...g,
          itemName: product?.EnglishName || g.itemCode,
          color: product?.color || null,
          image: product?.image || null,
        };
      })
      .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

    return res.status(200).json(
      generateResponse(200, true, "Finished goods grouped", {
        rows,
        total: rows.length,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ── GET /api/finished-goods/:fgSerial ──────────────────────────────────────
// Full trace for a single FG serial — public so QR codes can link here.
// Returns merge record + both serials' details + full SerialEvent history.
exports.getFinishedGoodTrace = async (req, res, next) => {
  try {
    const { fgSerial } = req.params;
    const record = await prisma.mergeRecord.findUnique({
      where: { fgSerial: fgSerial.trim() },
    });

    if (!record) {
      const err = new CustomError(`No finished good found for FG serial: ${fgSerial}`);
      err.statusCode = 404;
      throw err;
    }

    // New FGs store the same serial in serial1 and serial2; older ones paired two
    const serialNumbers = fgSerialNumbers(record);

    const [serialRows, events, product] = await Promise.all([
      prisma.controlSerial.findMany({
        where: { serialNumber: { in: serialNumbers } },
        include: {
          product: true,
          supplier: true,
          binLocation: true,
          master: { select: { poNumber: true, receivedStatus: true, isSentToSupplier: true } },
        },
      }),
      prisma.serialEvent.findMany({
        where: { serialNumber: { in: serialNumbers } },
        orderBy: { occurredAt: "asc" },
      }),
      record.itemCode
        ? prisma.tblItemCodes1S1Br.findFirst({ where: { ItemCode: record.itemCode } })
        : Promise.resolve(null),
    ]);

    // Build combined timeline
    const timeline = [
      {
        type: "FG_CREATED",
        title: "Finished Good Created",
        description: `FG serial ${record.fgSerial} generated from ${serialNumbers.join(" + ")}`,
        occurredAt: record.createdAt,
        performedBy: record.mergedBy,
      },
      ...events.map((e) => ({
        type: e.eventType,
        title: formatEventTitle(e.eventType),
        description: e.description,
        serialNumber: e.serialNumber,
        performedBy: e.performedBy,
        occurredAt: e.occurredAt,
      })),
    ].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

    return res.status(200).json(
      generateResponse(200, true, "Finished good trace retrieved", {
        fg: {
          fgSerial: record.fgSerial,
          serialNumbers,
          poNumber: record.poNumber,
          itemCode: record.itemCode,
          size: record.size,
          gtin: record.gtin,
          mergedBy: record.mergedBy,
          createdAt: record.createdAt,
        },
        product: product
          ? {
              itemCode: product.ItemCode,
              englishName: product.EnglishName,
              arabicName: product.ArabicName,
              gtin: product.GTIN,
              image: product.image,
              color: product.color,
              upper: product.upper,
              sole: product.sole,
              width: product.width,
              brandName: product.BrandName,
            }
          : null,
        serials: serialRows.map((s) => ({
          serialNumber: s.serialNumber,
          qty: s.sideQty,
          size: s.size,
          isReceived: s.isReceived,
          isSentToSupplier: s.isSentToSupplier,
          bin: s.binLocation?.binNumber || null,
          supplier: s.supplier?.name || null,
          poNumber: s.master?.poNumber || s.poNumber,
        })),
        timeline,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ── Helper ─────────────────────────────────────────────────────────────────
function formatEventTitle(eventType) {
  const map = {
    CREATED: "Serial Created",
    SENT_TO_SUPPLIER: "Sent to Supplier",
    RECEIVED: "Received from Supplier",
    PUT_AWAY: "Put Away in Warehouse",
    MERGED: "Merged into Finished Good",
  };
  return map[eventType] || eventType;
}
