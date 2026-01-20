const prisma = require("../db");

class TblIFSOMaster {
  // Fetch all records
  static async fetchAll() {
    try {
      return await prisma.tblFSOMaster.findMany();
    } catch (error) {
      console.error("Failed to retrieve records from tblFSOMaster:", error);
      throw error;
    }
  }

  // Fetch a single record by SO_NUMBER
  static async findBySONumber(soNumber) {
    try {
      return await prisma.tblFSOMaster.findUnique({
        where: { SO_NUMBER: soNumber },
      });
    } catch (error) {
      console.error(
        `Failed to retrieve record with SO_NUMBER ${soNumber}:`,
        error
      );
      throw error;
    }
  }

  // Create a new record
  static async create(data) {
    try {
      return await prisma.tblFSOMaster.create({
        data: data,
      });
    } catch (error) {
      console.error("Failed to create a new record in tblFSOMaster:", error);
      throw error;
    }
  }

  // Update a record by SO_NUMBER
  static async update(soNumber, data) {
    try {
      return await prisma.tblFSOMaster.update({
        where: { SO_NUMBER: soNumber },
        data: data,
      });
    } catch (error) {
      console.error(
        `Failed to update record with SO_NUMBER ${soNumber}:`,
        error
      );
      throw error;
    }
  }

  // Delete a record by SO_NUMBER
  static async delete(soNumber) {
    try {
      return await prisma.tblFSOMaster.delete({
        where: { SO_NUMBER: soNumber },
      });
    } catch (error) {
      console.error(
        `Failed to delete record with SO_NUMBER ${soNumber}:`,
        error
      );
      throw error;
    }
  }
}

module.exports = TblIFSOMaster;
