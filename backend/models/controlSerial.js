const prisma = require("../db");

class ControlSerialModel {
  /**
   * Create multiple control serials in bulk
   * @param {Array} serials - Array of serial objects with ItemCode, serialNumber, size, poNumber, supplierId
   * @returns {Promise<Array>} - Created serial records
   */
  static async createBulk(serials) {
    return await prisma.controlSerial.createMany({
      data: serials,
      //   skipDuplicates: true,
    });
  }

  /**
   * Get a control serial by ID
   * @param {string} id - Serial ID
   * @returns {Promise<Object>} - Serial record with product details and supplier
   */
  static async findById(id) {
    return await prisma.controlSerial.findUnique({
      where: { id },
      include: {
        product: true,
        supplier: true,
        binLocation: true,
      },
    });
  }

  /**
   * Get all control serials with pagination
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @param {string} search - Search by serialNumber or ItemCode
   * @param {string} poNumber - Filter by PO number (optional)
   * @param {string} supplierId - Filter by supplier ID (optional)
   * @returns {Promise<Object>} - Paginated serials and pagination info
   */
  static async findAllWithPagination(
    page = 1,
    limit = 10,
    search = null,
    poNumber = null,
    itemCode = null,
    supplierId = null,
    isArchived = false,
    size = null,
  ) {
    const skip = (page - 1) * limit;

    const where = {};

    // Add search condition
    if (search) {
      where.OR = [
        { serialNumber: { contains: search } },
        { ItemCode: { contains: search } },
      ];
    }

    // Add PO number filter
    if (poNumber) {
      where.poNumber = poNumber;
    }

    if (itemCode) {
      where.product = { ItemCode: itemCode };
    }

    // Add supplier ID filter
    if (supplierId) {
      where.supplierId = supplierId;
    }

    // Add isArchived filter
    // Only apply filter if isArchived is explicitly true or false (not null)
    if (isArchived !== null && typeof isArchived === "boolean") {
      where.isArchived = isArchived;
    }

    // Add size filter
    if (size) {
      where.size = size;
    }

    const [controlSerials, total] = await Promise.all([
      prisma.controlSerial.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          supplier: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.controlSerial.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      controlSerials,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get all control serials
   * @returns {Promise<Array>} - All serial records
   */
  static async findAll() {
    return await prisma.controlSerial.findMany({
      include: {
        product: true,
        supplier: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Search control serials by PO number
   * @param {string} poNumber - PO number to search
   * @param {boolean} includeArchived - Whether to include archived records (default: false)
   * @returns {Promise<Array>} - Matching serials
   */
  static async findByPoNumber(
    poNumber,
    includeArchived = false,
    size = null,
    hasPutAway = null,
  ) {
    const where = {
      poNumber: poNumber,
    };

    // Add size filter
    if (size) {
      where.size = size;
    }

    // Only filter by isArchived if we don't want to include archived records
    if (!includeArchived) {
      where.OR = [{ isArchived: false }, { isArchived: null }];
    }

    // Add hasPutAway filter
    if (hasPutAway !== null && typeof hasPutAway === "boolean") {
      // if hasPutAway is true, we check for non-null binLocationId
      if (hasPutAway) {
        where.binLocationId = { not: null };
      } else {
        // if hasPutAway is false, we check for null binLocationId
        where.binLocationId = null;
      }
    }

    return await prisma.controlSerial.findMany({
      where,
      include: {
        product: true,
        supplier: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Filter control serials by poNumber and get the totoal count for
   * those whose isSentToSupplier is false
   * @param {string} poNumber - PO number to filter
   * @returns {Promise<number>} - Total count of matching serials
   */

  static async countUnsentByPoNumber(poNumber) {
    return await prisma.controlSerial.count({
      where: {
        poNumber: poNumber,
        isSentToSupplier: false,
        isArchived: false,
      },
    });
  }

  /**
   * Search control serials by ItemCode
   * @param {string} itemCode - ItemCode to search
   * @returns {Promise<Array>} - Matching serials
   */
  static async findByItemCode(itemCode) {
    return await prisma.controlSerial.findMany({
      where: {
        ItemCode: itemCode,
      },
      include: {
        product: true,
        supplier: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Search control serials by serialNumber
   * @param {string} serialNumber - Serial number to search
   * @returns {Promise<Object>} - Matching serial
   */
  static async findBySerialNumber(serialNumber) {
    return await prisma.controlSerial.findUnique({
      where: {
        serialNumber,
      },
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  /**
   * Update a control serial
   * @param {string} id - Serial ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} - Updated serial
   */
  static async update(id, data) {
    return await prisma.controlSerial.update({
      where: { id },
      data,
      include: {
        product: true,
        supplier: true,
        binLocation: true,
      },
    });
  }

  /**
   * Delete a control serial
   * @param {string} id - Serial ID
   * @returns {Promise<Object>} - Deleted serial
   */
  static async deleteById(id) {
    return await prisma.controlSerial.delete({
      where: { id },
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  /**
   * Check if serial number already exists
   * @param {string} serialNumber - Serial number to check
   * @returns {Promise<boolean>} - True if exists
   */
  static async serialNumberExists(serialNumber) {
    const record = await prisma.controlSerial.findFirst({
      where: { serialNumber },
    });
    return !!record;
  }

  /**
   * Get the next series number for an ItemCode
   * @param {string} itemCode - ItemCode to get next series for
   * @returns {Promise<number>} - Next series number (6 digits with leading zeros)
   */
  static async getNextSeriesNumber(itemCode) {
    // Get all serials for this ItemCode
    const allSerials = await prisma.controlSerial.findMany({
      where: {
        ItemCode: itemCode,
      },
      select: {
        serialNumber: true,
      },
    });

    if (!allSerials || allSerials.length === 0) {
      return "000001";
    }

    // Extract all series numbers and find the maximum
    let maxSeriesNum = 0;
    for (const serial of allSerials) {
      if (serial.serialNumber && serial.serialNumber.length >= 6) {
        const seriesNum = parseInt(serial.serialNumber.slice(-6));
        if (seriesNum > maxSeriesNum) {
          maxSeriesNum = seriesNum;
        }
      }
    }

    const nextNum = maxSeriesNum + 1;

    if (nextNum > 999999) {
      throw new Error("Series number exceeds maximum value (999999)");
    }

    return nextNum.toString().padStart(6, "0");
  }

  /**
   * Get unique PO numbers with supplier details for a specific supplier
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Array>} - Array of unique PO numbers with supplier details
   */
  static async getPoNumbersWithSupplierDetailsBySupplierId(supplierId) {
    const controlSerials = await prisma.controlSerial.findMany({
      where: {
        supplierId: supplierId,
        isSentToSupplier: true,
      },
      select: {
        poNumber: true,
        size: true,
        product: {
          select: {
            ItemCode: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      distinct: ["poNumber"],
      orderBy: {
        createdAt: "desc",
      },
    });

    return controlSerials;
  }

  /**
   * Get PO numbers with supplier details for a SLIC Admin
   * @returns {Promise<Array>} - Array of unique PO numbers with supplier details
   */
  static async getPoNumbersWithSupplierDetails(
    itemCode,
    size = null,
    isArchived = null,
    hasPutAway = null,
  ) {
    const where = {};
    if (itemCode) {
      where.product = { ItemCode: itemCode };
    }
    if (size) {
      where.size = size;
    }
    if (isArchived !== null && typeof isArchived === "boolean") {
      where.isArchived = isArchived;
    }
    // Add hasPutAway filter
    if (hasPutAway !== null && typeof hasPutAway === "boolean") {
      // if hasPutAway is true, we check for non-null binLocationId
      if (hasPutAway) {
        where.binLocationId = { not: null };
      } else {
        // if hasPutAway is false, we check for null binLocationId
        where.binLocationId = null;
      }
    }

    const controlSerials = await prisma.controlSerial.findMany({
      where,
      select: {
        poNumber: true,
        size: true,
        isSentToSupplier: true,
        ItemCode: true,
        binLocation: {
          select: {
            binNumber: true,
            binType: true,
            gln: true,
            sgln: true,
            zoneCode: true,
            groupWarehouse: true,
          },
        },
        product: {
          select: {
            ItemCode: true,
            ProductSize: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      distinct: ["poNumber", "size"],
      orderBy: {
        createdAt: "desc",
      },
    });

    return controlSerials;
  }

  /**
   * Get total count of control serials for a specific poNumber
   * @returns {Promise<number>} - Total count of control serials
   */
  static async countByPoNumber(poNumber, size = null) {
    const where = { poNumber: poNumber };

    if (size) {
      where.size = size;
    }

    return await prisma.controlSerial.count({
      where: where,
    });
  }

  /**
   * Mark multiple control serials as sent using their IDs
   * @param {Array<string>} ids - Array of control serial IDs to mark as sent
   * @returns {Promise<Object>} - Result of updateMany
   */
  static async markAsSentByIds(ids) {
    if (!ids || ids.length === 0) return { count: 0 };

    return await prisma.controlSerial.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        isSentToSupplier: true,
        binLocationId: null,
      },
    });
  }

  /**
   * Archive all control serials by PO number
   * @param {string} poNumber - PO number to archive
   * @returns {Promise<Object>} - Result of updateMany with count of archived records
   */
  static async archiveByPoNumber(poNumber, size = null) {
    if (!poNumber) {
      throw new Error("PO number is required");
    }

    const where = { poNumber: poNumber };

    if (size) {
      where.size = size;
    }

    return await prisma.controlSerial.updateMany({
      where: where,
      data: {
        isArchived: true,
      },
    });
  }

  /**
   * Unarchive all control serials by PO number
   * @param {string} poNumber - PO number to unarchive
   * @returns {Promise<Object>} - Result of updateMany with count of unarchived records
   */
  static async unarchiveByPoNumber(poNumber, size = null) {
    if (!poNumber) {
      throw new Error("PO number is required");
    }
    const where = { poNumber: poNumber };

    if (size) {
      where.size = size;
    }

    return await prisma.controlSerial.updateMany({
      where: where,
      data: {
        isArchived: false,
      },
    });
  }

  /**
   * Update control serials by PO number and size
   * @param {string} poNumber - PO number
   * @param {string} size - Size
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} - Update result with count
   */
  static async updateByPoNumberAndSize(poNumber, size, data) {
    const where = {
      poNumber: poNumber,
    };

    if (size) {
      where.size = size;
    }

    return await prisma.controlSerial.updateMany({
      where: where,
      data: data,
    });
  }

  /**
   * Get unique PO numbers with combined total qty, isSentToSupplier status
   * Optimized: Uses groupBy for aggregation and fetches details in parallel
   * @param {boolean} isArchived - Filter by archived status (optional)
   * @returns {Promise<Array>} - Array of unique PO numbers with details, totalQty, isSentToSupplier
   */
  static async getUniquePONumbersWithTotalQty(isArchived = null) {
    const where = {};

    if (isArchived !== null && typeof isArchived === "boolean") {
      where.isArchived = isArchived;
    }

    // Step 1: Get aggregated data per PO number (totalQty and sent counts)
    const poAggregations = await prisma.controlSerial.groupBy({
      by: ["poNumber"],
      where,
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });

    if (!poAggregations || poAggregations.length === 0) {
      return [];
    }

    // Step 2: Get sent status counts for each PO in a single query
    const sentCounts = await prisma.controlSerial.groupBy({
      by: ["poNumber", "isSentToSupplier"],
      where: {
        ...where,
        poNumber: { in: poAggregations.map((p) => p.poNumber) },
      },
      _count: {
        id: true,
      },
    });

    // Build a map of PO -> { totalSent, totalNotSent }
    const sentStatusMap = {};
    for (const item of sentCounts) {
      if (!sentStatusMap[item.poNumber]) {
        sentStatusMap[item.poNumber] = { sent: 0, notSent: 0 };
      }
      if (item.isSentToSupplier === true) {
        sentStatusMap[item.poNumber].sent = item._count.id;
      } else {
        sentStatusMap[item.poNumber].notSent = item._count.id;
      }
    }

    // Step 3: Fetch representative records for each PO (for product/supplier details)
    const poNumbers = poAggregations.map((p) => p.poNumber);
    const representatives = await prisma.controlSerial.findMany({
      where: {
        ...where,
        poNumber: { in: poNumbers },
      },
      select: {
        id: true,
        poNumber: true,
        serialNumber: true,
        ItemCode: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            ItemCode: true,
            ProductSize: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      distinct: ["poNumber"],
      orderBy: {
        createdAt: "desc",
      },
    });

    // Build a map for quick lookup
    const repMap = {};
    for (const rep of representatives) {
      repMap[rep.poNumber] = rep;
    }

    // Step 4: Combine all data
    const result = poAggregations.map((agg) => {
      const rep = repMap[agg.poNumber] || {};
      const status = sentStatusMap[agg.poNumber] || { sent: 0, notSent: 0 };

      // Determine isSentToSupplier: true if all sent, false if none sent, null if partial
      let isSentToSupplier = null;
      if (status.notSent === 0 && status.sent > 0) {
        isSentToSupplier = true;
      } else if (status.sent === 0 && status.notSent > 0) {
        isSentToSupplier = false;
      }

      return {
        id: rep.id,
        poNumber: agg.poNumber,
        serialNumber: rep.serialNumber,
        ItemCode: rep.ItemCode,
        product: rep.product,
        supplier: rep.supplier,
        totalQty: agg._count.id,
        isSentToSupplier,
        createdAt: rep.createdAt,
      };
    });

    // Sort by createdAt desc
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return result;
  }

  /**
   * Get total count of control serials for a PO number (all sizes combined)
   * @param {string} poNumber - PO number
   * @returns {Promise<number>} - Total count
   */
  static async countAllByPoNumber(poNumber) {
    return await prisma.controlSerial.count({
      where: { poNumber: poNumber },
    });
  }

  /**
   * Get all control serials for a PO number grouped by size with counts
   * @param {string} poNumber - PO number
   * @returns {Promise<Array>} - Array of records grouped by size
   */
  static async getControlSerialsByPONumberGroupedBySize(poNumber) {
    // Get all records for this PO number
    const records = await prisma.controlSerial.findMany({
      where: { poNumber: poNumber },
      select: {
        id: true,
        serialNumber: true,
        size: true,
        poNumber: true,
        ItemCode: true,
        isSentToSupplier: true,
        isArchived: true,
        binLocationId: true,
        product: {
          select: {
            id: true,
            ItemCode: true,
            ProductSize: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        binLocation: {
          select: {
            id: true,
            binNumber: true,
            binType: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { size: "asc" },
        { createdAt: "desc" },
      ],
    });

    return records;
  }

  /**
   * Get size summary for a PO number (unique sizes with their counts)
   * @param {string} poNumber - PO number
   * @returns {Promise<Array>} - Array of size summaries
   */
  static async getSizeSummaryByPoNumber(poNumber) {
    const sizeCounts = await prisma.controlSerial.groupBy({
      by: ["size"],
      where: { poNumber: poNumber },
      _count: {
        id: true,
      },
    });

    // Get one representative record per size for product details
    const sizeDetails = await Promise.all(
      sizeCounts.map(async (sizeGroup) => {
        const representative = await prisma.controlSerial.findFirst({
          where: {
            poNumber: poNumber,
            size: sizeGroup.size,
          },
          select: {
            id: true,
            size: true,
            poNumber: true,
            ItemCode: true,
            isSentToSupplier: true,
            isArchived: true,
            product: {
              select: {
                id: true,
                ItemCode: true,
                ProductSize: true,
              },
            },
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return {
          ...representative,
          qty: sizeGroup._count.id,
        };
      })
    );

    return sizeDetails;
  }
}

module.exports = ControlSerialModel;
