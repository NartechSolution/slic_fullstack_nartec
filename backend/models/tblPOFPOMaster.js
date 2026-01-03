const CustomError = require("../exceptions/customError");
const prisma = require("../db");

class TblPOFPOPMasterModel {
  // Create a new record
  static async create(data) {
    try {
      const newRecord = await prisma.tblPOFPOMaster.create({
        data,
      });
      return newRecord;
    } catch (error) {
      throw new CustomError("Error creating record");
    }
  }

  // Read all records
  static async findAll() {
    try {
      const records = await prisma.tblPOFPOMaster.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      return records;
    } catch (error) {
      console.log(error);
      throw new CustomError("Error fetching records");
    }
  }

  // Paginated
  static async findPaginated(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const records = await prisma.tblPOFPOMaster.findMany({
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: "desc", // Or 'desc' for descending order
        },
      });

      const totalRecords = await prisma.tblPOFPOMaster.count();

      return {
        records,
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
      };
    } catch (error) {
      throw new CustomError("Error fetching paginated records");
    }
  }

  // Read a single record by ID
  static async findById(id) {
    try {
      const record = await prisma.tblPOFPOMaster.findUnique({
        where: { tblPOFPOMasterID: id },
      });
      return record;
    } catch (error) {
      throw new CustomError("Error fetching record");
    }
  }

  // Update a record by ID
  static async update(id, data) {
    try {
      const updatedRecord = await prisma.tblPOFPOMaster.update({
        where: { tblPOFPOMasterID: id },
        data,
      });
      return updatedRecord;
    } catch (error) {
      throw new CustomError("Error updating record");
    }
  }

  // Delete a record by ID
  static async delete(id) {
    try {
      const deletedRecord = await prisma.tblPOFPOMaster.delete({
        where: { tblPOFPOMasterID: id },
      });
      return deletedRecord;
    } catch (error) {
      throw new CustomError("Error deleting record");
    }
  }
}

module.exports = TblPOFPOPMasterModel;
