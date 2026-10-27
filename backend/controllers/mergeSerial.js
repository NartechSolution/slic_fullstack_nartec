/**
 * Merge Serial Controller
 * =======================
 * Turns one unit (pair) of a control serial into a Finished Good barcode.
 *
 * Rules enforced:
 *  - The serial must exist as a ControlSerial record and not be archived
 *  - A serial can produce at most `sideQty` FGs (its planned qty in pairs)
 *
 * MergeRecord.serial1/serial2 are both required columns; single-serial merges
 * store the same serial in both.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const generateResponse = require("../utils/response");
const CustomError = require("../exceptions/customError");

// ── Helper: generate a deterministic FG serial ──────────────────────────────
function buildFgSerial(poNumber, size) {
  const ts = Date.now();
  // Random suffix prevents collisions when two merges land in the same ms
  // (matters when batch-scanning many units of the same master serial).
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  const po = (poNumber || "NOPO").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  const sz = (size || "XX").replace(/\s+/g, "");
  return `FG-${po}-${sz}-${ts}${rnd}`;
}

// ── Helper: count merge usages of a serial number ───────────────────────────
async function countMergeUsages(serialNumber) {
  if (!serialNumber) return 0;
  return prisma.mergeRecord.count({
    where: {
      OR: [{ serial1: serialNumber }, { serial2: serialNumber }],
    },
  });
}

// ── GET /api/merge-serial — list all merge records (paginated) ───────────────
exports.listMergeRecords = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { poNumber, itemCode } = req.query;

    const where = {};
    if (poNumber) where.poNumber = { contains: poNumber };
    if (itemCode) where.itemCode = { contains: itemCode };

    const [total, records] = await Promise.all([
      prisma.mergeRecord.count({ where }),
      prisma.mergeRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json(
      generateResponse(200, true, "Merge records retrieved", {
        records,
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

// ── POST /api/merge-serial/validate — validate a single serial ───────────────
exports.validateSerial = async (req, res, next) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber?.trim()) {
      const err = new CustomError("serialNumber is required");
      err.statusCode = 400;
      throw err;
    }

    // Look up the serial
    const serial = await prisma.controlSerial.findFirst({
      where: { serialNumber: serialNumber.trim() },
      include: { product: true, supplier: true },
    });

    if (!serial) {
      const err = new CustomError(`Serial not found: ${serialNumber}`);
      err.statusCode = 404;
      throw err;
    }

    if (serial.isArchived) {
      const err = new CustomError(`Serial ${serialNumber} is archived and cannot be merged`);
      err.statusCode = 400;
      throw err;
    }

    // A "master" ControlSerial can be merged up to `sideQty` times — once per
    // pair it represents.
    const mergeCount = await countMergeUsages(serial.serialNumber);
    const cap = serial.sideQty && serial.sideQty > 0 ? serial.sideQty : 1;
    const remaining = Math.max(0, cap - mergeCount);
    const isFullyMerged = remaining === 0;

    // Last-merge ref (informational — shown to the user when fully merged)
    const lastMerge = mergeCount > 0
      ? await prisma.mergeRecord.findFirst({
          where: { OR: [{ serial1: serial.serialNumber }, { serial2: serial.serialNumber }] },
          orderBy: { createdAt: "desc" },
        })
      : null;

    res.status(200).json(
      generateResponse(200, true, "Serial validated successfully", {
        serialNumber: serial.serialNumber,
        qty: cap,
        // Merge-usage tracking
        mergeCount,
        mergeCap: cap,
        mergesRemaining: remaining,
        isFullyMerged,
        // Backwards-compat: only flag "already merged" once the cap is hit
        isAlreadyMerged: isFullyMerged,
        existingFgSerial: lastMerge?.fgSerial || null,
        product: {
          itemCode: serial.product?.ItemCode || null,
          englishName: serial.product?.EnglishName || null,
          gtin: serial.product?.GTIN || null,
          size: serial.size || serial.product?.ProductSize || null,
          color: serial.product?.color || null,
          image: serial.product?.image || null,
        },
        po: {
          poNumber: serial.poNumber,
          supplier: serial.supplier?.name || null,
          isReceived: serial.isReceived,
          isSentToSupplier: serial.isSentToSupplier,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

// ── POST /api/merge-serial/merge — turn one unit of a serial into an FG ─────
exports.mergeSerials = async (req, res, next) => {
  try {
    const { mergedBy } = req.body;
    const serialNumber = req.body.serialNumber?.trim();

    if (!serialNumber) {
      const err = new CustomError("serialNumber is required");
      err.statusCode = 400;
      throw err;
    }

    const serial = await prisma.controlSerial.findFirst({
      where: { serialNumber },
      include: { product: true },
    });

    if (!serial) {
      const err = new CustomError(`Serial not found: ${serialNumber}`);
      err.statusCode = 404;
      throw err;
    }

    if (serial.isArchived) {
      const err = new CustomError(`Serial ${serialNumber} is archived and cannot be merged`);
      err.statusCode = 400;
      throw err;
    }

    // Cap-based merge check
    // ─────────────────────
    // A master ControlSerial can be merged up to `sideQty` times — once per
    // pair it represents. This lets workers scan the same master barcode many
    // times to produce every FG in the lot.
    const count = await countMergeUsages(serialNumber);
    const cap = serial.sideQty && serial.sideQty > 0 ? serial.sideQty : 1;

    if (count >= cap) {
      const err = new CustomError(
        `Serial ${serialNumber} has reached its merge cap (${count}/${cap}). All units under this master serial have been produced.`
      );
      err.statusCode = 400;
      throw err;
    }

    const size = (serial.size || serial.product?.ProductSize || "").trim();
    const poNumber = serial.poNumber || null;
    const fgSerial = buildFgSerial(poNumber, size);
    const performer = mergedBy || "System";

    // Create merge record + fire event in a transaction
    const [mergeRecord] = await prisma.$transaction([
      prisma.mergeRecord.create({
        data: {
          serial1: serialNumber,
          serial2: serialNumber,
          fgSerial,
          poNumber,
          itemCode: serial.product?.ItemCode || null,
          size: size || null,
          gtin: serial.product?.GTIN || null,
          mergedBy: performer,
        },
      }),
      prisma.serialEvent.create({
        data: {
          serialNumber,
          eventType: "MERGED",
          description: `Finished Good created → FG: ${fgSerial}`,
          metadata: JSON.stringify({ fgSerial, poNumber }),
          performedBy: performer,
        },
      }),
    ]);

    // Post-merge usage — useful for the UI to show "X of Y merged · N left"
    const newCount = count + 1;

    res.status(201).json(
      generateResponse(201, true, "Finished Good created successfully", {
        fgSerial: mergeRecord.fgSerial,
        serialNumber,
        poNumber: mergeRecord.poNumber,
        itemCode: mergeRecord.itemCode,
        size: mergeRecord.size,
        gtin: mergeRecord.gtin,
        mergedAt: mergeRecord.createdAt,
        // Cap usage post-merge — lets the frontend show remaining counts and
        // decide whether to clear the input (cap reached) or keep it for
        // batch scanning the same master serial.
        usage: { count: newCount, cap, remaining: Math.max(0, cap - newCount) },
        product: {
          itemCode: serial.product?.ItemCode,
          englishName: serial.product?.EnglishName,
          gtin: serial.product?.GTIN,
          size,
          color: serial.product?.color,
          image: serial.product?.image,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

// ── GET /api/merge-serial/counts-by-item ────────────────────────────────────
// Aggregated merge counts grouped by (itemCode, size). Consumed by the
// Production RM List to compute "pairs already consumed by production" so the
// list can show available-vs-merged and flag rows as fully consumed.
//
// Query params:
//   itemCode (optional) — filter to one product
//   size     (optional) — filter to one size
//   from, to (optional) — ISO date range against MergeRecord.createdAt
//
// Response:
//   { items: [{ itemCode, size, mergedCount, lastMergedAt }], totalMerged }
exports.getCountsByItem = async (req, res, next) => {
  try {
    const { itemCode, size, from, to } = req.query;

    const where = {};
    if (itemCode) where.itemCode = itemCode;
    if (size) where.size = String(size);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Group by itemCode+size. SQL Server via Prisma: use groupBy aggregation.
    const grouped = await prisma.mergeRecord.groupBy({
      by: ["itemCode", "size"],
      where,
      _count: { _all: true },
      _max: { createdAt: true },
    });

    const items = grouped
      .filter((g) => g.itemCode) // drop null item codes
      .map((g) => ({
        itemCode: g.itemCode,
        size: g.size || null,
        mergedCount: g._count._all,
        lastMergedAt: g._max.createdAt,
      }));

    const totalMerged = items.reduce((s, g) => s + g.mergedCount, 0);

    res.status(200).json(
      generateResponse(200, true, "Merge counts retrieved", {
        items,
        totalMerged,
      })
    );
  } catch (error) {
    next(error);
  }
};

// ── GET /api/merge-serial/:fgSerial — public — get FG merge details ──────────
exports.getMergeByFgSerial = async (req, res, next) => {
  try {
    const { fgSerial } = req.params;

    const record = await prisma.mergeRecord.findUnique({
      where: { fgSerial: fgSerial.trim() },
    });

    if (!record) {
      const err = new CustomError(`No merge record found for FG serial: ${fgSerial}`);
      err.statusCode = 404;
      throw err;
    }

    // Get both serials' product info
    const [s1, s2] = await Promise.all([
      prisma.controlSerial.findFirst({
        where: { serialNumber: record.serial1 },
        include: { product: true },
      }),
      prisma.controlSerial.findFirst({
        where: { serialNumber: record.serial2 },
        include: { product: true },
      }),
    ]);

    res.status(200).json(
      generateResponse(200, true, "Merge record retrieved", {
        ...record,
        serial1Detail: s1
          ? { serialNumber: s1.serialNumber, size: s1.size, isReceived: s1.isReceived }
          : null,
        serial2Detail: s2
          ? { serialNumber: s2.serialNumber, size: s2.size, isReceived: s2.isReceived }
          : null,
        product: s1?.product
          ? {
              itemCode: s1.product.ItemCode,
              englishName: s1.product.EnglishName,
              gtin: s1.product.GTIN,
              image: s1.product.image,
            }
          : null,
      })
    );
  } catch (error) {
    next(error);
  }
};
