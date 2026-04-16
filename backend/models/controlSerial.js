const prisma = require("../db");
const { v4: uuidv4 } = require("uuid");

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

    // 1. Get unique PO numbers with pagination
    const uniquePosRaw = await prisma.controlSerialMaster.groupBy({
      by: ["poNumber"],
      where,
      orderBy: { _max: { createdAt: "desc" } },
      skip,
      take: limit,
    });

    if (uniquePosRaw.length === 0) {
      return { masters: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }

    const poNumbers = uniquePosRaw.map(p => p.poNumber);

    // 2. Fetch full metadata and aggregate metrics
    const [allMastersForPos, serialCounts] = await Promise.all([
      prisma.controlSerialMaster.findMany({
        where: { poNumber: { in: poNumbers } },
        include: {
          product: { select: { id: true, ItemCode: true, ProductSize: true, EnglishName: true } },
          supplier: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.controlSerial.groupBy({
        by: ["poNumber", "size", "isReceived", "isSentToSupplier", "side"],
        where: { poNumber: { in: poNumbers } },
        _count: { id: true },
        _sum: { sideQty: true, receivedSideQty: true },
      })
    ]);

    // 3. Consolidate: one entry per PO (units-based, not serial-count based)
    const enriched = poNumbers.map(po => {
      const mastersForPo = allMastersForPos.filter(m => m.poNumber === po);
      const latestMaster = mastersForPo[0];

      const poSerials = serialCounts.filter(s => s.poNumber === po);
      // totalQty = sum of planned units (fallback to serial count for legacy data without sideQty)
      const totalQty = poSerials.reduce((sum, s) => sum + ((s._sum?.sideQty || 0) || s._count.id), 0);
      const rightQty = poSerials.filter(s => s.side === "R").reduce((sum, s) => sum + (s._sum?.sideQty || 0), 0);
      const leftQty = poSerials.filter(s => s.side === "L").reduce((sum, s) => sum + (s._sum?.sideQty || 0), 0);

      // Aggregates
      const isSentToSupplierAgg = mastersForPo.every(m => m.isSentToSupplier);

      // Received units: prefer receivedSideQty sum; fallback to count of isReceived legacy rows
      const receivedCount = poSerials.reduce((sum, s) => {
        const recUnits = s._sum?.receivedSideQty || 0;
        if (recUnits > 0) return sum + recUnits;
        // legacy row (no side): if isReceived, count by _count.id
        if (s.isReceived && !s.side) return sum + s._count.id;
        return sum;
      }, 0);

      let receivedStatus;
      if (receivedCount === 0) receivedStatus = "pending";
      else if (totalQty > 0 && receivedCount >= totalQty) receivedStatus = "received";
      else receivedStatus = "partially_received";

      return {
        id: latestMaster.id,
        poNumber: po,
        productId: latestMaster.productId,
        supplierId: latestMaster.supplierId,
        product: latestMaster.product,
        supplier: latestMaster.supplier,
        isSentToSupplier: isSentToSupplierAgg,
        receivedStatus,
        isArchived: latestMaster.isArchived,
        createdAt: latestMaster.createdAt,
        totalQty,
        totalCount: totalQty, // For frontend compatibility
        rightQty,
        leftQty,
        receivedQty: receivedCount, // For frontend compatibility
        sizeSummary: buildSizeSummaryFromSerialsConsolidated(poSerials)
      };
    });

    // 4. Total unique POs count for pagination
    const totalCountResult = await prisma.controlSerialMaster.groupBy({
      by: ["poNumber"],
      where,
    });
    const total = totalCountResult.length;
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
      orderBy: [{ size: "asc" }, { side: "asc" }],
    });

    const updateOps = [];

    for (const entry of sizeReceived) {
      const { size } = entry;
      if (!size) continue;

      // Support both new payload (rightReceived/leftReceived) and legacy (receivedQty)
      const rightReceived = Number(entry.rightReceived ?? 0);
      const leftReceived = Number(entry.leftReceived ?? 0);
      const legacyQty = Number(entry.receivedQty ?? 0);

      const forSize = allSerials.filter((s) => s.size === size);
      const rightSerial = forSize.find((s) => s.side === "R");
      const leftSerial = forSize.find((s) => s.side === "L");

      // Calculate target received per side
      let rTarget = 0;
      let lTarget = 0;

      if (rightReceived > 0 || leftReceived > 0) {
        // New payload: explicit per-side values
        rTarget = Math.min(rightReceived, rightSerial?.sideQty || 0);
        lTarget = Math.min(leftReceived, leftSerial?.sideQty || 0);
      } else if (legacyQty > 0) {
        // Legacy: distribute total across R then L (fill R first, then L)
        const rMax = rightSerial?.sideQty || 0;
        const lMax = leftSerial?.sideQty || 0;
        rTarget = Math.min(legacyQty, rMax);
        lTarget = Math.min(Math.max(legacyQty - rMax, 0), lMax);
      } else {
        continue;
      }

      if (rightSerial && rTarget > 0) {
        updateOps.push(
          prisma.controlSerial.update({
            where: { id: rightSerial.id },
            data: {
              receivedSideQty: rTarget,
              isReceived: rTarget >= (rightSerial.sideQty || 0),
            },
          })
        );
      }
      if (leftSerial && lTarget > 0) {
        updateOps.push(
          prisma.controlSerial.update({
            where: { id: leftSerial.id },
            data: {
              receivedSideQty: lTarget,
              isReceived: lTarget >= (leftSerial.sideQty || 0),
            },
          })
        );
      }
    }

    if (updateOps.length > 0) {
      await Promise.all(updateOps);
    }

    // Recompute receivedStatus from fresh data — based on UNITS, not serial count
    const refreshed = await prisma.controlSerial.findMany({
      where: { masterId },
      select: { sideQty: true, receivedSideQty: true, isReceived: true },
    });

    const totalUnits = refreshed.reduce((sum, s) => sum + (s.sideQty || 0), 0);
    const receivedUnits = refreshed.reduce((sum, s) => sum + (s.receivedSideQty || 0), 0);

    let receivedStatus;
    if (receivedUnits === 0) receivedStatus = "pending";
    else if (totalUnits > 0 && receivedUnits >= totalUnits) receivedStatus = "received";
    else receivedStatus = "partially_received";

    const updateData = { receivedStatus };
    // Set receivedAt on first receive (any status change from pending)
    if (receivedStatus !== "pending") {
      updateData.receivedAt = new Date();
    }

    return await prisma.controlSerialMaster.update({
      where: { id: masterId },
      data: updateData,
      include: { product: true, supplier: true },
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
            .map(({ serialNumber, ItemCode, supplierId, poNumber, size, masterId, side, sideQty }) => {
              const id = uuidv4();
              const esc = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
              const sideVal = side ? esc(side) : "NULL";
              const sideQtyVal = sideQty != null ? sideQty : "NULL";
              return `(${esc(id)},${esc(serialNumber)},${esc(ItemCode)},${esc(supplierId)},${esc(poNumber)},${esc(size)},${esc(masterId)},0,0,0,NULL,${sideVal},${sideQtyVal},'${now}','${now}')`;
            })
            .join(",\n");

          const sql = `
            INSERT INTO [dbo].[ControlSerial]
              (id, serialNumber, ItemCode, supplierId, poNumber, size, masterId,
               isSentToSupplier, isReceived, isArchived, binLocationId, side, sideQty, createdAt, updatedAt)
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
   * Get the next series start number for a RAW ItemCode string (e.g. "49188EH").
   *
   * Serial numbers are formatted as `<ItemCode><6-digit-seq>`, so the next sequence
   * must be scoped by the raw ItemCode prefix — NOT by productId — otherwise
   * different sizes of the same ItemCode produce duplicate serial numbers.
   *
   * Uses a LIKE prefix query and parses the last 6 chars of MAX(serialNumber) to
   * find the highest sequence seen so far across all sizes/PRs for this ItemCode.
   *
   * @param {string} rawItemCode  The raw ItemCode string (e.g. "49188EH")
   * @returns {Promise<number>}   Next sequence number (integer)
   */
  static async getNextSeriesForRawItemCode(rawItemCode) {
    if (!rawItemCode) return 1;

    // Escape single quotes for raw SQL prefix
    const escaped = rawItemCode.replace(/'/g, "''");
    const prefixLike = `${escaped}%`;

    const rows = await prisma.$queryRawUnsafe(`
      SELECT TOP 1 serialNumber
      FROM [dbo].[ControlSerial]
      WHERE serialNumber LIKE '${prefixLike}'
        AND LEN(serialNumber) = ${rawItemCode.length + 6}
      ORDER BY serialNumber DESC
    `);

    if (!rows || rows.length === 0) return 1;
    const maxSerial = rows[0].serialNumber;
    if (!maxSerial || maxSerial.length < 6) return 1;

    const seqStr = maxSerial.slice(-6);
    const seq = parseInt(seqStr, 10);
    if (Number.isNaN(seq)) return 1;
    const nextNum = seq + 1;
    if (nextNum > 999999) {
      throw new Error(`Series number exceeds 999999 for ItemCode ${rawItemCode}`);
    }
    return nextNum;
  }

  /**
   * DEPRECATED — kept for backward compatibility with callers that pass productIds.
   * New code should use getNextSeriesForRawItemCode(rawItemCode) instead.
   * @param {string[]} productIds
   * @returns {Map<string, string>}  productId → next 6-digit series string
   */
  static async getNextSeriesNumbersBatch(productIds) {
    if (!productIds || productIds.length === 0) return new Map();

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
  static async getUniquePONumbersWithTotalQty(
    isArchived = null,
    supplierId = null,
    page = 1,
    limit = 10,
    isSentToSupplier = null
  ) {
    const skip = (page - 1) * limit;

    // ──────────────────────────────────────────────────────────────────────
    // Build WHERE clauses for the raw SQL query.
    // We need raw SQL because the response aggregates isSentToSupplier across
    // ALL masters of a PO with .every() — a simple groupBy filter would leak
    // POs that have some sent + some unsent masters. HAVING is the only way
    // to filter on that aggregate cleanly AND page correctly.
    // ──────────────────────────────────────────────────────────────────────
    const whereParts = ["1=1"];
    if (isArchived !== null && typeof isArchived === "boolean") {
      whereParts.push(`isArchived = ${isArchived ? 1 : 0}`);
    }
    if (supplierId) {
      const escapedId = String(supplierId).replace(/'/g, "''");
      whereParts.push(`supplierId = '${escapedId}'`);
    }
    const whereSql = whereParts.join(" AND ");

    // HAVING filter for the aggregate "all masters sent" / "not all sent"
    let havingSql = "";
    if (isSentToSupplier === true) {
      // Every master for this PO must be sent → MIN(cast to int) = 1
      havingSql = "HAVING MIN(CAST(isSentToSupplier AS INT)) = 1";
    } else if (isSentToSupplier === false) {
      // At least one master is still unsent → MIN(cast to int) = 0
      havingSql = "HAVING MIN(CAST(isSentToSupplier AS INT)) = 0";
    }

    // 1a. Page of PO numbers (ordered by most recent createdAt)
    const pageRows = await prisma.$queryRawUnsafe(`
      SELECT poNumber
      FROM [dbo].[ControlSerialMaster]
      WHERE ${whereSql}
      GROUP BY poNumber
      ${havingSql}
      ORDER BY MAX(createdAt) DESC
      OFFSET ${skip} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    const poNumbers = pageRows.map((r) => r.poNumber).filter(Boolean);

    // 1b. Total count (same filters) for pagination
    const totalRows = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total
      FROM (
        SELECT poNumber
        FROM [dbo].[ControlSerialMaster]
        WHERE ${whereSql}
        GROUP BY poNumber
        ${havingSql}
      ) t
    `);
    const total = Number(totalRows[0]?.total || 0);

    if (poNumbers.length === 0) return { masters: [], total };

    // 2. Fetch full metadata and aggregate metrics
    const [masters, allSerialsForPos] = await Promise.all([
      prisma.controlSerialMaster.findMany({
        where: { poNumber: { in: poNumbers } },
        include: {
          product: { select: { id: true, ItemCode: true, ProductSize: true, GTIN: true } },
          supplier: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.controlSerial.groupBy({
        by: ["poNumber", "size", "isReceived", "side"],
        where: { poNumber: { in: poNumbers } },
        _count: { id: true },
        _sum: { sideQty: true },
      })
    ]);

    // 3. Consolidate: one entry per PO
    const consolidated = poNumbers.map(po => {
      // Find the latest master for metadata
      const latestMaster = masters.find(m => m.poNumber === po);
      const poSerialsSummary = allSerialsForPos.filter(s => s.poNumber === po);
      const totalSideQty = poSerialsSummary.reduce((sum, s) => sum + (s._sum?.sideQty || 0), 0);
      const totalQty = totalSideQty > 0 ? totalSideQty : poSerialsSummary.reduce((sum, s) => sum + s._count.id, 0);
      const rightQty = poSerialsSummary.filter(s => s.side === "R").reduce((sum, s) => sum + (s._sum?.sideQty || 0), 0);
      const leftQty = poSerialsSummary.filter(s => s.side === "L").reduce((sum, s) => sum + (s._sum?.sideQty || 0), 0);
      const receivedQty = poSerialsSummary.filter(s => s.isReceived).reduce((sum, s) => sum + (s._sum?.sideQty || s._count.id), 0);
      
      // A PO is considered 'sent' if ALL its masters are marked as sent
      const allMastersForPo = masters.filter(m => m.poNumber === po);
      const isSentToSupplier = allMastersForPo.every(m => m.isSentToSupplier);

      let receivedStatus;
      if (receivedQty === 0) receivedStatus = "pending";
      else if (receivedQty >= totalQty) receivedStatus = "received";
      else receivedStatus = "partially_received";
      
      return {
        id: latestMaster.id,
        poNumber: po,
        ItemCode: latestMaster.productId,
        product: latestMaster.product,
        supplier: latestMaster.supplier,
        isSentToSupplier,
        receivedStatus,
        isArchived: latestMaster.isArchived,
        createdAt: latestMaster.createdAt,
        updatedAt: latestMaster.updatedAt,
        totalQty,
        totalCount: totalQty, // For frontend compatibility
        rightQty,
        leftQty,
        receivedQty,        // For frontend compatibility
        sizeSummary: buildSizeSummaryFromSerialsConsolidated(poSerialsSummary)
      };
    });

    // 4. Total already computed above via raw SQL
    return {
      masters: consolidated,
      total,
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

    const masters = await prisma.controlSerialMaster.findMany({
      where,
      include: {
        product: { select: { ItemCode: true, ProductSize: true, GTIN: true } },
        supplier: { select: { id: true, name: true, email: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const masterIds = masters.map((m) => m.id);
    const itemCodes = [...new Set(masters.map((m) => m.product?.ItemCode).filter(Boolean))];

    const [summaries, products] = await Promise.all([
      prisma.controlSerial.groupBy({
        // Include side so we can split rightQty / leftQty per size
        by: ["masterId", "size", "isReceived", "side"],
        where: { masterId: { in: masterIds } },
        _count: { id: true },
        _sum: { sideQty: true, receivedSideQty: true },
      }),
      prisma.tblItemCodes1S1Br.findMany({
        where: { ItemCode: { in: itemCodes } },
        select: { ItemCode: true, ProductSize: true, GTIN: true },
      }),
    ]);

    return {
      masters: masters.map((m) => {
        const mSummaries = summaries.filter((s) => s.masterId === m.id);
        const map = {};
        let totalCount = 0;
        let totalReceived = 0;

        for (const s of mSummaries) {
          const sz = s.size || "unknown";
          if (!map[sz]) {
            const matchingProduct = products.find(
              (p) => p.ItemCode === m.product?.ItemCode && p.ProductSize === sz
            );
            map[sz] = {
              size: sz,
              total: 0,
              received: 0,
              pending: 0,
              rightQty: 0,
              leftQty: 0,
              rightReceived: 0,
              leftReceived: 0,
              gtin: matchingProduct?.GTIN || null,
            };
          }

          // Unit-based count: prefer sideQty sum; fall back to row count for legacy rows
          const plannedUnits = s._sum?.sideQty && s._sum.sideQty > 0 ? s._sum.sideQty : s._count.id;
          const receivedUnits = s._sum?.receivedSideQty && s._sum.receivedSideQty > 0
            ? s._sum.receivedSideQty
            : s.isReceived ? s._count.id : 0;

          map[sz].total += plannedUnits;
          totalCount += plannedUnits;
          totalReceived += receivedUnits;

          if (s.isReceived) map[sz].received += plannedUnits;
          else map[sz].received += receivedUnits;
          map[sz].pending = map[sz].total - map[sz].received;

          if (s.side === "R") {
            map[sz].rightQty += plannedUnits;
            map[sz].rightReceived += receivedUnits;
          } else if (s.side === "L") {
            map[sz].leftQty += plannedUnits;
            map[sz].leftReceived += receivedUnits;
          }
        }

        const sizeSummary = Object.values(map).sort((a, b) =>
          a.size.localeCompare(b.size, undefined, { numeric: true })
        );

        // Recompute PO-level receivedStatus from units
        let receivedStatus;
        if (totalReceived <= 0) receivedStatus = "pending";
        else if (totalCount > 0 && totalReceived >= totalCount) receivedStatus = "received";
        else receivedStatus = "partially_received";

        return {
          poNumber: m.poNumber,
          product: m.product,
          supplier: m.supplier,
          isSentToSupplier: m.isSentToSupplier,
          receivedStatus,
          sizeSummary,
          isArchived: m.isArchived,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          totalCount,
          receivedQty: totalReceived,
        };
      }),
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
   * Get size summary for a PO number — unit-based with R/L breakdown
   */
  static async getSizeSummaryByPoNumber(poNumber) {
    const rows = await prisma.controlSerial.groupBy({
      by: ["size", "side"],
      where: { poNumber },
      _count: { id: true },
      _sum: { sideQty: true, receivedSideQty: true },
    });

    // Consolidate by size
    const map = {};
    for (const r of rows) {
      const sz = r.size || "unknown";
      if (!map[sz]) {
        map[sz] = { size: sz, qty: 0, rightQty: 0, leftQty: 0, receivedQty: 0 };
      }
      const units = (r._sum?.sideQty || 0) || r._count.id;
      const recUnits = r._sum?.receivedSideQty || 0;
      map[sz].qty += units;
      map[sz].receivedQty += recUnits;
      if (r.side === "R") map[sz].rightQty += units;
      else if (r.side === "L") map[sz].leftQty += units;
    }

    return Object.values(map).sort((a, b) =>
      String(a.size).localeCompare(String(b.size), undefined, { numeric: true })
    );
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

/**
 * Build a per-size summary from a summarized (groupBy) array of serial objects.
 * Units are measured via sideQty (falls back to _count.id for legacy rows with no side).
 * @param {Array<{size, isReceived, side, _count: {id: number}, _sum?: {sideQty: number}}>} summaries
 */
function buildSizeSummaryFromSerialsConsolidated(summaries = []) {
  const map = {};
  for (const s of summaries) {
    const sz = String(s.size || "unknown").trim();
    if (!map[sz]) {
      map[sz] = { size: sz, total: 0, received: 0, pending: 0, rightQty: 0, leftQty: 0 };
    }
    // Prefer sideQty sum (new model); fallback to count (legacy rows)
    const units = (s._sum?.sideQty || 0) || s._count.id;
    map[sz].total += units;
    if (s.isReceived) map[sz].received += units;
    else map[sz].pending += units;
    if (s.side === "R") map[sz].rightQty += units;
    else if (s.side === "L") map[sz].leftQty += units;
  }
  return Object.values(map).sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));
}

module.exports = { ControlSerialModel, ControlSerialMasterModel };
