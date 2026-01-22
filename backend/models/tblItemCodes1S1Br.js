const { body } = require("express-validator");
const prisma = require("../db");

class ItemCodeModel {
  static async create(data) {
    return await prisma.tblItemCodes1S1Br.create({
      data,
    });
  }

  static async createMany(data) {
    return await prisma.tblItemCodes1S1Br.createMany({
      data,
    });
  }

  static async findManyByGTINs(gtins) {
    return await prisma.tblItemCodes1S1Br.findMany({
      where: {
        GTIN: {
          in: gtins,
        },
      },
    });
  }

  static async upsert(gtin, data) {
    // Check if record exists
    const existing = await prisma.tblItemCodes1S1Br.findFirst({
      where: { GTIN: gtin },
    });

    if (existing) {
      // Update existing record, merging new data with existing data
      return await prisma.tblItemCodes1S1Br.update({
        where: { id: existing.id },
        data,
      });
    } else {
      // Create new record
      return await prisma.tblItemCodes1S1Br.create({
        data,
      });
    }
  }

  static async bulkUpsert(records) {
    // Get all GTINs from records
    const gtins = records
      .map((r) => r.GTIN)
      .filter((g) => g != null && g !== "");

    if (gtins.length === 0) {
      return { created: 0, updated: 0 };
    }

    // Find existing records
    const existingRecords = await this.findManyByGTINs(gtins);
    const existingGTINs = new Set(existingRecords.map((r) => r.GTIN));

    // Separate new and existing records
    const newRecords = [];
    const updateRecords = [];

    for (const record of records) {
      if (record.GTIN && existingGTINs.has(record.GTIN)) {
        updateRecords.push(record);
      } else {
        newRecords.push(record);
      }
    }

    let created = 0;
    let updated = 0;

    // Insert new records
    if (newRecords.length > 0) {
      const result = await prisma.tblItemCodes1S1Br.createMany({
        data: newRecords,
      });
      created = result.count;
    }

    // Update existing records
    if (updateRecords.length > 0) {
      // Update records individually (Prisma doesn't support bulk upsert efficiently)
      for (const record of updateRecords) {
        const existing = existingRecords.find((e) => e.GTIN === record.GTIN);
        if (existing) {
          // Merge existing data with new data (new data takes precedence)
          const mergedData = { ...existing, ...record };
          // Remove id and timestamps from update data
          delete mergedData.id;
          delete mergedData.Created_at;
          delete mergedData.Updated_at;

          await prisma.tblItemCodes1S1Br.update({
            where: { id: existing.id },
            data: mergedData,
          });
          updated++;
        }
      }
    }

    return { created, updated };
  }

  static async findAllWithPagination(page = 1, limit = 10, search = null) {
    const skip = (page - 1) * limit;

    // Build the query object
    const query = search
      ? {
          where: {
            OR: [
              { GTIN: { contains: search } },
              { ItemCode: { contains: search } },
              { EnglishName: { contains: search } },
              { ArabicName: { contains: search } },
              { LotNo: { contains: search } },
              { sERIALnUMBER: { contains: search } },
              { WHLocation: { contains: search } },
              { BinLocation: { contains: search } },
              {
                QRCodeInternational: { contains: search },
              },
              { ModelName: { contains: search } },
              { ProductType: { contains: search } },
              { BrandName: { contains: search } },
              { PackagingType: { contains: search } },
              { ProductUnit: { contains: search } },
              { ProductSize: { contains: search } },
            ],
          },
        }
      : {};

    const [itemCodes, totalItems] = await Promise.all([
      prisma.tblItemCodes1S1Br.findMany({
        skip,
        take: limit,
        ...query,
      }),
      prisma.tblItemCodes1S1Br.count({
        where: query.where,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      itemCodes,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  static async findAll() {
    const itemCodes = await prisma.tblItemCodes1S1Br.findMany({
      orderBy: {
        Created_at: "desc", // or 'desc' for descending order
      },
    });
    return itemCodes;
  }

  static async findById(gtin) {
    return await prisma.tblItemCodes1S1Br.findFirst({
      where: { GTIN: gtin.toString() },
    });
  }

  static async findByItemCode(itemCode) {
    return await prisma.tblItemCodes1S1Br.findFirst({
      where: { ItemCode: itemCode.toString() },
    });
  }

  static async findByItemCodeAndSize(itemCode, size) {
    return await prisma.tblItemCodes1S1Br.findFirst({
      where: { ItemCode: itemCode.toString(), ProductSize: size.toString() },
    });
  }

  static async findByGTIN(gtin) {
    return await prisma.tblItemCodes1S1Br.findMany({
      where: {
        GTIN: {
          contains: gtin.toString(),
        },
      },
    });
  }

  static async update(id, data) {
    const itemCode = await prisma.tblItemCodes1S1Br.update({
      where: { id: id.toString() },
      data,
    });

    return itemCode;
  }

  static async updateMany(gtins, data) {
    const itemCodes = await prisma.tblItemCodes1S1Br.updateMany({
      where: {
        GTIN: {
          in: gtins,
        },
      },
      data,
    });

    return itemCodes;
  }

  static async updateManyByItemCodeAndSizes(itemCode, sizes, data) {
    const itemCodes = await prisma.tblItemCodes1S1Br.updateMany({
      where: {
        ItemCode: itemCode,
        ProductSize: {
          in: sizes,
        },
      },
      data,
    });

    return itemCodes;
  }

  static async findManyByItemCodeAndSizes(itemCode, sizes) {
    return await prisma.tblItemCodes1S1Br.findMany({
      where: {
        ItemCode: itemCode,
        ProductSize: {
          in: sizes,
        },
      },
    });
  }

  static async delete(gtin) {
    return await prisma.tblItemCodes1S1Br.delete({
      where: { GTIN: gtin.toString() },
    });
  }

  static async deleteById(id) {
    return await prisma.tblItemCodes1S1Br.delete({
      where: { id: id },
    });
  }

  static async searchByGtin(gtin) {
    return await prisma.tblItemCodes1S1Br.findMany({
      where: {
        GTIN: {
          contains: gtin.toString(),
        },
      },
    });
  }

  static async findDuplicateGTINs() {
    // Find all GTINs that have duplicates using raw SQL for better performance
    const duplicates = await prisma.$queryRaw`
      SELECT GTIN, COUNT(*) as count
      FROM TblItemCodes1S1Br
      WHERE GTIN IS NOT NULL AND GTIN != ''
      GROUP BY GTIN
      HAVING COUNT(*) > 1
    `;
    return duplicates;
  }

  static async findAllByGTIN(gtin) {
    return await prisma.tblItemCodes1S1Br.findMany({
      where: { GTIN: gtin },
      orderBy: { Created_at: 'desc' }, // Most recent first
    });
  }

  static async deleteByIds(ids) {
    return await prisma.tblItemCodes1S1Br.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  static async deleteAll() {
    return await prisma.tblItemCodes1S1Br.deleteMany({});
  }

  static async countAll() {
    return await prisma.tblItemCodes1S1Br.count();
  }

  static async deleteWithoutBarcode() {
    return await prisma.tblItemCodes1S1Br.deleteMany({
      where: {
        OR: [
          { GTIN: null },
          { GTIN: '' },
        ],
      },
    });
  }

  static async countWithoutBarcode() {
    return await prisma.tblItemCodes1S1Br.count({
      where: {
        OR: [
          { GTIN: null },
          { GTIN: '' },
        ],
      },
    });
  }

  /**
   * Search item codes by ItemCode field
   * Returns top 20 matching records
   * @param {string} search - Search term for ItemCode
   * @returns {Promise<Array>} - Array of matching item codes (max 20)
   */
  static async searchByItemCode(search) {
    return await prisma.tblItemCodes1S1Br.findMany({
      where: {
        ItemCode: {
          contains: search,
        },
      },
      take: 20,
      orderBy: {
        ItemCode: "asc",
      },
      select: {
        id: true,
        ItemCode: true,
        EnglishName: true,
        ArabicName: true,
        GTIN: true,
        ProductSize: true,
        BrandName: true,
        ModelName: true,
      },
    });
  }
}

module.exports = ItemCodeModel;
