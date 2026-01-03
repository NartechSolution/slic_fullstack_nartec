const CustomError = require("../exceptions/customError");
const prisma = require("../db");

class POFPODetails {
  // Existing method: Get records by HEAD_SYS_ID
  static async getRecordsByHeadSysId(headSysId) {
    try {
      const records = await prisma.tblPOFPODetails.findMany({
        where: {
          HEAD_SYS_ID: parseFloat(headSysId),
        },
      });
      return records;
    } catch (error) {
      console.error("Error fetching POFPODetails by HEAD_SYS_ID:", error);
      throw new CustomError(
        "Error occurred while fetching line items by HEAD_SYS_ID"
      );
    }
  }

  // Existing method: Fetch records by multiple HEAD_SYS_IDs
  static async fetchByMultipleIds(headSysIds) {
    try {
      const idsArray = headSysIds.map((id) => parseFloat(id));
      const records = await prisma.tblPOFPODetails.findMany({
        where: {
          HEAD_SYS_ID: {
            in: idsArray,
          },
        },
      });
      return records;
    } catch (error) {
      console.error(
        "Error fetching POFPODetails by multiple HEAD_SYS_IDs:",
        error
      );
      throw new CustomError(
        "Error occurred while fetching line items by multiple HEAD_SYS_IDs"
      );
    }
  }

  // New method: Create a new record
  static async createRecord(data) {
    try {
      const newRecord = await prisma.tblPOFPODetails.create({
        data,
      });
      return newRecord;
    } catch (error) {
      console.error("Error creating POFPODetails record:", error);
      throw new CustomError("Error occurred while creating a line item");
    }
  }

  // New method: Get all records
  static async getAllRecords() {
    try {
      const records = await prisma.tblPOFPODetails.findMany();
      return records;
    } catch (error) {
      console.error("Error fetching all POFPODetails records:", error);
      throw new CustomError("Error occurred while fetching all line items");
    }
  }

  // New method: Update a record by HEAD_SYS_ID and ITEM_CODE
  static async updateRecord(headSysId, itemCode, data) {
    try {
      const updatedRecord = await prisma.tblPOFPODetails.updateMany({
        where: {
          HEAD_SYS_ID: parseFloat(headSysId),
          ITEM_CODE: itemCode,
        },
        data,
      });
      return updatedRecord;
    } catch (error) {
      console.error("Error updating POFPODetails record:", error);
      throw new CustomError("Error occurred while updating the line item");
    }
  }

  // New method: Delete a record by HEAD_SYS_ID and ITEM_CODE
  static async deleteRecord(headSysId, itemCode) {
    try {
      const deletedRecord = await prisma.tblPOFPODetails.deleteMany({
        where: {
          HEAD_SYS_ID: parseFloat(headSysId),
          ITEM_CODE: itemCode,
        },
      });
      return deletedRecord;
    } catch (error) {
      console.error("Error deleting POFPODetails record:", error);
      throw new CustomError("Error occurred while deleting the line item");
    }
  }
}

module.exports = POFPODetails;
