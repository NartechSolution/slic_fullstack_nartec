const prisma = require("../db");

// ═══════════════════════════════════════════════════════════════════════════
// ControlSerialMasterModel — Master-level operations (one row per PO+product+supplier)
// ═══════════════════════════════════════════════════════════════════════════
class ControlSerialMasterModel {
  /**
   * Create a ControlSerialMaster record
   * @param {Object} data - { productId, poNumber, supplierId }
   * @returns {Promise<Object>} - Created master record
   */
  static async create(data) {
    return await prisma.controlSerialMaster.create({
      data,
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  /**
   * Find master by ID, including all children grouped by size
   * @param {string} id - Master ID
   */
  static async findById(id) {
    return await prisma.controlSerialMaster.findUnique({
      where: { id },
      include: {
        product: true,
        supplier: true,
        serials: {
          orderBy: [{ size: "asc" }, { serialNumber: "asc" }],
          include: { binLocation: true },
        },
      },
    });
  }

  /**
   * Find master by PO number
   * @param {string} poNumber
   */
  static async findByPoNumber(poNumber) {
    return await prisma.controlSerialMaster.findFirst({
      where: { poNumber },
      include: { product: true, supplier: true, serials: true },
    });
  }

  /**
   * Get all masters with pagination and filtering
   */
  static async findAllWithPagination({
    page = 1,
    limit = 10,
    search = null,
    isArchived = null,
    isSentToSupplier = null,
    supplierId = null,
    itemCode = null,
  } = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [{ poNumber: { contains: search } }];
    }
    if (isArchived !== null && typeof isArchived === "boolean") {
      where.isArchived = isArchived;
    }
    if (isSentToSupplier !== null && typeof isSentToSupplier === "boolean") {
      where.isSentToSupplier = isSentToSupplier;
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }
    if (itemCode) {
      where.product = { ItemCode: itemCode };
    }

    const [masters, total] = await Promise.all([
      prisma.controlSerialMaster.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, ItemCode: true, ProductSize: true, EnglishName: true } },
          supplier: { select: { id: true, name: true, email: true } },
          serials: {
            select: { id: true, size: true, isReceived: true, isSentToSupplier: true, isArchived: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.controlSerialMaster.count({ where }),
    ]);

    // Annotate each master with size summary
    const enriched = masters.map((m) => ({
      ...m,
      totalQty: m.serials.length,
      sizeSummary: buildSizeSummary(m.serials),
      serials: undefined, // don't leak full list in list view
    }));

    const totalPages = Math.ceil(total / limit);
    return {
      masters: enriched,
      pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    };
  }

  /**
   * Get all masters (for supplier/po-numbers endpoint) - returns unique PO entries
   */
  static async getUniquePOsWithDetails({
    isArchived = null,
    supplierId = null,
    itemCode = null,
    isSentToSupplier = null,
  } = {}) {
    const where = {};
    if (isArchived !== null && typeof isArchived === "boolean") where.isArchived = isArchived;
    if (supplierId) where.supplierId = supplierId;
    if (itemCode) where.product = { ItemCode: itemCode };
    if (isSentToSupplier !== null && typeof isSentToSupplier === "boolean") {
      where.isSentToSupplier = isSentToSupplier;
    }

    const masters = await prisma.controlSerialMaster.findMany({
      where,
      include: {
        product: { select: { id: true, ItemCode: true, ProductSize: true } },
        supplier: { select: { id: true, name: true, email: true, status: true } },
        serials: {
          select: { id: true, size: true, isReceived: true, isSentToSupplier: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return masters.map((m) => ({
      id: m.id,
      poNumber: m.poNumber,
      product: m.product,
      supplier: m.supplier,
      isSentToSupplier: m.isSentToSupplier,
      receivedStatus: m.receivedStatus,
      isArchived: m.isArchived,
      totalQty: m.serials.length,
      sizeSummary: buildSizeSummary(m.serials),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  /**
   * Update master record
   */
  static async update(id, data) {
    return await prisma.controlSerialMaster.update({
      where: { id },
      data,
      include: { product: true, supplier: true },
    });
  }

  /**
   * Mark master as sent to supplier (also marks all children)
   */
  static async markAsSent(masterId, serialIds) {
    await prisma.controlSerial.updateMany({
      where: { id: { in: serialIds } },
      data: { isSentToSupplier: true },
    });
    return await prisma.controlSerialMaster.update({
      where: { id: masterId },
      data: { isSentToSupplier: true },
      include: { product: true, supplier: true },
    });
  }

  /**
   * Receive serials with per-size quantity input.
   * Marks exactly `receivedQty` children for each size as isReceived=true.
   * Then recomputes and updates master.receivedStatus.
   *
   * @param {string} masterId
   * @param {Array<{size: string, receivedQty: number}>} sizeReceived
   */
  static async receiveWithQty(masterId, sizeReceived) {
    // Load all children for this master
    const allSerials = await prisma.controlSerial.findMany({
      where: { masterId },
      orderBy: [{ size: "asc" }, { createdAt: "asc" }],
    });

    const updateOps = [];

    for (const { size, receivedQty } of sizeReceived) {
      if (!size || receivedQty <= 0) continue;

      // Get serials for this size that aren't yet received
      const forSize = allSerials.filter((s) => s.size === size && !s.isReceived);
      const toReceive = forSize.slice(0, receivedQty);

      if (toReceive.length > 0) {
        // Batch update these specific serials
        updateOps.push(
          prisma.controlSerial.updateMany({
            where: { id: { in: toReceive.map((s) => s.id) } },
            data: { isReceived: true },
          })
        );
      }
    }

    if (updateOps.length > 0) {
      await Promise.all(updateOps);
    }

    // Recompute receivedStatus from fresh data
    const refreshed = await prisma.controlSerial.findMany({
      where: { masterId },
      select: { isReceived: true },
    });

    const total = refreshed.length;
    const receivedCount = refreshed.filter((s) => s.isReceived).length;
    let receivedStatus;
    if (receivedCount === 0) receivedStatus = "pending";
    else if (receivedCount >= total) receivedStatus = "received";
    else receivedStatus = "partial";

    return await prisma.controlSerialMaster.update({
      where: { id: masterId },
      data: { receivedStatus },
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  /**
   * Archive / unarchive master and all its children
   */
  static async setArchived(masterId, isArchived) {
    await prisma.controlSerial.updateMany({
      where: { masterId },
      data: { isArchived },
    });
    return await prisma.controlSerialMaster.update({
      where: { id: masterId },
      data: { isArchived },
    });
  }

  /**
   * Delete master and all its children
   */
  static async deleteById(masterId) {
    await prisma.controlSerial.deleteMany({ where: { masterId } });
    return await prisma.controlSerialMaster.delete({ where: { id: masterId } });
  }

  /**
   * Get size summary for a master (unique sizes with counts and status)
   */
  static async getSizeSummary(masterId) {
    const serials = await prisma.controlSerial.findMany({
      where: { masterId },
      select: { size: true, isReceived: true, binLocationId: true, isArchived: true },
    });
    return buildSizeSummary(serials);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ControlSerialModel — Child-level operations (individual serial numbers)
// ═══════════════════════════════════════════════════════════════════════════
class ControlSerialModel {
  /**
   * Create multiple control serials in bulk using raw SQL INSERT.
   *
   * Why raw SQL?
   * - Prisma's createMany uses parameterised queries → SQL Server cap of 2100
   *   params forces batches of ≤350 rows (6 cols × 350 = 2100).
   * - Raw SQL VALUES lists have NO parameter limit in SQL Server; we insert
   *   1 000 rows per statement, run up to `concurrency` statements in parallel.
   * - For 500 000 rows: 500 chunks × 1 000 rows, 50 parallel → ~10 DB waves.
   *
   * @param {Array<{serialNumber,ItemCode,supplierId,poNumber,size,masterId}>} serials
   * @param {number} chunkSize   Rows per INSERT statement (SQL Server max 1 000)
   * @param {number} concurrency Parallel INSERT statements per wave
   */
  static async createBulkBatched(serials, chunkSize = 1000, concurrency = 50) {
    if (!serials || serials.length === 0) return { count: 0 };

    // Pre-build chunks
    const chunks = [];
    for (let i = 0; i < serials.length; i += chunkSize) {
      chunks.push(serials.slice(i, i + chunkSize));
    }

    const now = new Date().toISOString(); // single timestamp for the whole batch
    let totalCount = 0;

    // Process waves of `concurrency` chunks in parallel
    for (let i = 0; i < chunks.length; i += concurrency) {
      const wave = chunks.slice(i, i + concurrency);
      const results = await Promise.all(
        wave.map((chunk) => {
          // Build VALUES list: each row is one comma-separated tuple
          const rows = chunk
            .map(({ serialNumber, ItemCode, supplierId, poNumber, size, masterId }) => {
              const esc = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
              return `(${esc(serialNumber)},${esc(ItemCode)},${esc(supplierId)},${esc(poNumber)},${esc(size)},${esc(masterId)},0,0,0,NULL,'${now}','${now}')`;
            })
            .join(",\n");

          const sql = `
            INSERT INTO [dbo].[ControlSerial]
              (serialNumber, ItemCode, supplierId, poNumber, size, masterId,
               isSentToSupplier, isReceived, isArchived, binLocationId, createdAt, updatedAt)
            VALUES ${rows}
          `;
          return prisma.$executeRawUnsafe(sql);
        })
      );
      totalCount += results.reduce((sum, r) => sum + r, 0);
    }

    return { count: totalCount };
  }

  /**
   * Fetch multiple control serials by serial numbers (batched)
   */
  static async findManyBySerialNumbers(serialNumbers, batchSize = 2000) {
    if (!serialNumbers || serialNumbers.length === 0) return [];
    const results = [];
    for (let i = 0; i < serialNumbers.length; i += batchSize) {
      const batch = serialNumbers.slice(i, i + batchSize);
      const records = await prisma.controlSerial.findMany({
        where: { serialNumber: { in: batch } },
        include: { product: true, supplier: true, master: true },
      });
      results.push(...records);
    }
    return results;
  }

  /**
   * Get a control serial by ID
   */
  static async findById(id) {
    return await prisma.controlSerial.findUnique({
      where: { id },
      include: { product: true, supplier: true, binLocation: true, master: true },
    });
  }

  /**
   * Get all control serials with pagination
   */
  static async findAllWithPagination(
    page = 1,
    limit = 10,
    search = null,
    poNumber = null,
    itemCode = null,
    supplierId = null,
    isArchived = false,
    size = null
  ) {
    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { serialNumber: { contains: search } },
        { ItemCode: { contains: search } },
      ];
    }
    if (poNumber) where.poNumber = poNumber;
    if (itemCode) where.product = { ItemCode: itemCode };
    if (supplierId) where.supplierId = supplierId;
    if (isArchived !== null && typeof isArchived === "boolean") where.isArchived = isArchived;
    if (size) where.size = size;

    const [controlSerials, total] = await Promise.all([
      prisma.controlSerial.findMany({
        where,
        skip,
        take: limit,
        include: { product: true, supplier: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.controlSerial.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      controlSerials,
      pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    };
  }

  /**
   * Get all control serials (no pagination)
   */
  static async findAll() {
    return await prisma.controlSerial.findMany({
      include: { product: true, supplier: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Search by PO number
   */
  static async findByPoNumber(poNumber, includeArchived = false, size = null, hasPutAway = null) {
    const where = { poNumber };
    if (size) where.size = size;
    if (!includeArchived) where.OR = [{ isArchived: false }, { isArchived: null }];
    if (hasPutAway !== null && typeof hasPutAway === "boolean") {
      where.binLocationId = hasPutAway ? { not: null } : null;
    }
    return await prisma.controlSerial.findMany({
      where,
      include: { product: true, supplier: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find by masterId
   */
  static async findByMasterId(masterId) {
    return await prisma.controlSerial.findMany({
      where: { masterId },
      include: { product: true, binLocation: true },
      orderBy: [{ size: "asc" }, { serialNumber: "asc" }],
    });
  }

  /**
   * Search by serial number
   */
  static async findBySerialNumber(serialNumber) {
    return await prisma.controlSerial.findFirst({
      where: { serialNumber },
      include: { product: true, supplier: true, master: true },
    });
  }

  /**
   * Search by ItemCode
   */
  static async findByItemCode(itemCode) {
    return await prisma.controlSerial.findMany({
      where: { ItemCode: itemCode },
      include: { product: true, supplier: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update a single control serial
   */
  static async update(id, data) {
    return await prisma.controlSerial.update({
      where: { id },
      data,
      include: { product: true, supplier: true, binLocation: true },
    });
  }

  /**
   * Delete a single control serial
   */
  static async deleteById(id) {
    return await prisma.controlSerial.delete({
      where: { id },
      include: { product: true, supplier: true },
    });
  }

  /**
   * Get next series number for a single product ItemCode (via MAX aggregation)
   */
  static async getNextSeriesNumber(itemCode) {
    const agg = await prisma.controlSerial.aggregate({
      where: { ItemCode: itemCode },
      _max: { serialNumber: true },
    });
    const maxSerial = agg._max.serialNumber;
    if (!maxSerial || maxSerial.length < 6) return "000001";
    const maxSeriesNum = parseInt(maxSerial.slice(-6), 10);
    const nextNum = maxSeriesNum + 1;
    if (nextNum > 999999) throw new Error("Series number exceeds maximum value (999999)");
    return nextNum.toString().padStart(6, "0");
  }

  /**
   * Batch version: get the next series start number for multiple product IDs
   * in a SINGLE raw SQL query (one MAX per productId via GROUP BY).
   *
   * @param {string[]} productIds  Array of TblItemCodes1S1Br.id values
   * @returns {Map<string, string>}  productId → next 6-digit series string
   */
  static async getNextSeriesNumbersBatch(productIds) {
    if (!productIds || productIds.length === 0) return new Map();

    // Build IN list (all values are internal cuid strings — safe to interpolate)
    const inList = productIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        ItemCode AS productId,
        MAX(serialNumber) AS maxSerial
      FROM [dbo].[ControlSerial]
      WHERE ItemCode IN (${inList})
      GROUP BY ItemCode
    `);

    const resultMap = new Map();
    // Seed with default "000001" for products not yet in DB
    for (const id of productIds) {
      resultMap.set(id, "000001");
    }
    for (const row of rows) {
      const maxSerial = row.maxSerial;
      if (maxSerial && maxSerial.length >= 6) {
        const nextNum = parseInt(maxSerial.slice(-6), 10) + 1;
        if (nextNum > 999999) throw new Error(`Series number exceeds 999999 for product ${row.productId}`);
        resultMap.set(row.productId, nextNum.toString().padStart(6, "0"));
      }
    }
    return resultMap;
  }

  /**
   * Mark multiple control serials as sent by IDs (batched)
   */
  static async markAsSentByIds(ids) {
    if (!ids || ids.length === 0) return { count: 0 };
    const BATCH_SIZE = 2000;
    let totalCount = 0;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const result = await prisma.controlSerial.updateMany({
        where: { id: { in: batch } },
        data: { isSentToSupplier: true },
      });
      totalCount += result.count;
    }
    return { count: totalCount };
  }

  /**
   * Count serials by PO number (with optional size filter)
   */
  static async countByPoNumber(poNumber, size = null) {
    const where = { poNumber };
    if (size) where.size = size;
    return await prisma.controlSerial.count({ where });
  }

  /**
   * Count unsent by PO number
   */
  static async countUnsentByPoNumber(poNumber) {
    return await prisma.controlSerial.count({
      where: { poNumber, isSentToSupplier: false, isArchived: false },
    });
  }

  /**
   * Update serials by PO number and optional size
   */
  static async updateByPoNumberAndSize(poNumber, size, data) {
    const where = { poNumber };
    if (size) where.size = size;
    return await prisma.controlSerial.updateMany({ where, data });
  }

  /**
   * Archive by PO number (and optional size)
   */
  static async archiveByPoNumber(poNumber, size = null) {
    const where = { poNumber };
    if (size) where.size = size;
    return await prisma.controlSerial.updateMany({ where, data: { isArchived: true } });
  }

  /**
   * Unarchive by PO number (and optional size)
   */
  static async unarchiveByPoNumber(poNumber, size = null) {
    const where = { poNumber };
    if (size) where.size = size;
    return await prisma.controlSerial.updateMany({ where, data: { isArchived: false } });
  }

  /**
   * Delete by PO number and optional size
   */
  static async deleteByPoNumberAndSize(poNumber, size = null) {
    const where = { poNumber };
    if (size) where.size = size;
    return await prisma.controlSerial.deleteMany({ where });
  }

  /**
   * Get unique PO numbers with total qty — now backed by ControlSerialMaster for efficiency
   */
  /**
   * Get unique PO numbers with total qty with pagination
   */
  static async getUniquePONumbersWithTotalQty(isArchived = null, supplierId = null, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = {};
    if (isArchived !== null && typeof isArchived === "boolean") where.isArchived = isArchived;
    if (supplierId) where.supplierId = supplierId;

    const masters = await prisma.controlSerialMaster.findMany({
      where,
      include: {
        product: { select: { id: true, ItemCode: true, ProductSize: true } },
        supplier: { select: { id: true, name: true, email: true } },
        serials: { select: { id: true, serialNumber: true, isReceived: true, isSentToSupplier: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return {
      masters: masters.map((m) => ({
        id: m.id,
        poNumber: m.poNumber,
        serialNumber: m.serials[0]?.serialNumber ?? null,
        ItemCode: m.productId,
        product: m.product,
        supplier: m.supplier,
        totalQty: m.serials.length,
        isSentToSupplier: m.isSentToSupplier,
        receivedStatus: m.receivedStatus,
        createdAt: m.createdAt,
      })),
      total: await prisma.controlSerialMaster.count({ where }),
    };
  }

  /**
   * Get PO numbers with supplier details (for po-numbers endpoint, SLIC admin)
   */
  /**
   * Get PO numbers with supplier details with pagination
   */
  static async getPoNumbersWithSupplierDetails(itemCode, size = null, isArchived = null, hasPutAway = null, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = {};
    if (itemCode) where.product = { ItemCode: itemCode };
    if (isArchived !== null && typeof isArchived === "boolean") where.isArchived = isArchived;

    let serialWhere = {};
    if (size) serialWhere.size = size;
    if (hasPutAway !== null) {
      serialWhere.binLocationId = hasPutAway ? { not: null } : null;
    }

    const masters = await prisma.controlSerialMaster.findMany({
      where,
      include: {
        product: { select: { ItemCode: true, ProductSize: true } },
        supplier: { select: { id: true, name: true, email: true, status: true } },
        serials: Object.keys(serialWhere).length > 0
          ? { where: serialWhere, select: { size: true, isReceived: true, isSentToSupplier: true } }
          : { select: { size: true, isReceived: true, isSentToSupplier: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return {
      masters: masters.map((m) => ({
        poNumber: m.poNumber,
        product: m.product,
        supplier: m.supplier,
        isSentToSupplier: m.isSentToSupplier,
        receivedStatus: m.receivedStatus,
        sizeSummary: buildSizeSummary(m.serials),
        isArchived: m.isArchived,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        totalCount: m.serials.length, // Already have them in memory
      })),
      total: await prisma.controlSerialMaster.count({ where }),
    };
  }

  /**
   * Get PO numbers for a specific supplier (supplier portal)
   */
  static async getPoNumbersWithSupplierDetailsBySupplierId(supplierId) {
    const masters = await prisma.controlSerialMaster.findMany({
      where: { supplierId, isSentToSupplier: true },
      include: {
        product: { select: { ItemCode: true } },
        supplier: { select: { id: true, name: true, email: true, status: true } },
        serials: { select: { size: true, isReceived: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return masters.map((m) => ({
      id: m.id,
      poNumber: m.poNumber,
      product: m.product,
      supplier: m.supplier,
      isSentToSupplier: m.isSentToSupplier,
      receivedStatus: m.receivedStatus,
      sizeSummary: buildSizeSummary(m.serials),
      totalQty: m.serials.length,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  /**
   * Count by PO number (all or by size)
   */
  static async countAllByPoNumber(poNumber) {
    return await prisma.controlSerial.count({ where: { poNumber } });
  }

  /**
   * Get all control serials for a PO number grouped by size
   */
  static async getControlSerialsByPONumberGroupedBySize(poNumber) {
    return await prisma.controlSerial.findMany({
      where: { poNumber },
      select: {
        id: true,
        serialNumber: true,
        size: true,
        poNumber: true,
        ItemCode: true,
        isSentToSupplier: true,
        isArchived: true,
        isReceived: true,
        binLocationId: true,
        masterId: true,
        product: { select: { id: true, ItemCode: true, ProductSize: true } },
        supplier: { select: { id: true, name: true, email: true } },
        binLocation: { select: { id: true, binNumber: true, binType: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ size: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Get size summary for a PO number
   */
  static async getSizeSummaryByPoNumber(poNumber) {
    const sizeCounts = await prisma.controlSerial.groupBy({
      by: ["size"],
      where: { poNumber },
      _count: { id: true },
    });
    return sizeCounts.map((s) => ({ size: s.size, qty: s._count.id }));
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────
/**
 * Build a per-size summary from a flat array of serial objects
 * @param {Array<{size, isReceived, isSentToSupplier, binLocationId}>} serials
 * @returns {Array<{size, total, received, pending, hasPutAway}>}
 */
function buildSizeSummary(serials = []) {
  const map = {};
  for (const s of serials) {
    const sz = s.size || "unknown";
    if (!map[sz]) map[sz] = { size: sz, total: 0, received: 0, pending: 0, hasPutAway: false };
    map[sz].total += 1;
    if (s.isReceived) map[sz].received += 1;
    else map[sz].pending += 1;
    if (s.binLocationId) map[sz].hasPutAway = true;
  }
  return Object.values(map).sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));
}

module.exports = { ControlSerialModel, ControlSerialMasterModel };
