const prisma = require("../db");

class BinLocationModel {
  static async create(data) {
    return await prisma.binLocation.create({
      data,
    });
  }

  static async findAllWithPagination(page = 1, limit = 10, search = null) {
    const skip = (page - 1) * limit;

    // Build the query object
    const query = search
      ? {
          where: {
            OR: [
              { groupWarehouse: { contains: search } },
              { zoneCode: { contains: search } },
              { zones: { contains: search } },
              { zoneName: { contains: search } },
              { binNumber: { contains: search } },
              { zoned: { contains: search } },
              { zoneType: { contains: search } },
              { binType: { contains: search } },
              { binRow: { contains: search } },
              { gln: { contains: search } },
              { sgln: { contains: search } },
              { mapLocation: { contains: search } },
            ],
          },
        }
      : {};

    const [binLocations, totalItems] = await Promise.all([
      prisma.binLocation.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        ...query,
      }),
      prisma.binLocation.count({
        where: query.where,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      binLocations,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  static async findAll() {
    const binLocations = await prisma.binLocation.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return binLocations;
  }

  static async findById(id) {
    return await prisma.binLocation.findUnique({
      where: { id: id },
    });
  }

  static async findByBinNumber(binNumber) {
    return await prisma.binLocation.findFirst({
      where: { binNumber: binNumber },
    });
  }

  static async findByGln(gln) {
    return await prisma.binLocation.findFirst({
      where: { gln: gln },
    });
  }

  static async findBySgln(sgln) {
    return await prisma.binLocation.findFirst({
      where: { sgln: sgln },
    });
  }

  static async findByZone(zoneCode) {
    return await prisma.binLocation.findMany({
      where: { zoneCode: zoneCode },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async findByWarehouse(groupWarehouse) {
    return await prisma.binLocation.findMany({
      where: { groupWarehouse: groupWarehouse },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async update(id, data) {
    const binLocation = await prisma.binLocation.update({
      where: { id: id },
      data,
    });

    return binLocation;
  }

  static async delete(id) {
    return await prisma.binLocation.delete({
      where: { id: id },
    });
  }

  static async deleteMany(ids) {
    return await prisma.binLocation.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}

module.exports = BinLocationModel;
