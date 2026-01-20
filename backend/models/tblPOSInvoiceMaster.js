const prisma = require("../db");

class POSInvoiceMaster {
  static async getInvoiceMasterById(id) {
    try {
      const master = await prisma.tblPOSInvoiceMaster.findUnique({
        where: { id },
      });
      return master;
    } catch (error) {
      console.error("Error fetching invoice master by ID:", error);
      throw new Error("Error fetching invoice master by ID");
    }
  }

  static async createInvoiceMaster(data) {
    try {
      const newMaster = await prisma.tblPOSInvoiceMaster.create({
        data,
      });
      return newMaster;
    } catch (error) {
      console.error("Error creating invoice master:", error);
      throw new Error("Error creating invoice master");
    }
  }

  static async updateInvoiceMaster(id, data) {
    try {
      const updatedMaster = await prisma.tblPOSInvoiceMaster.update({
        where: { id },
        data,
      });
      return updatedMaster;
    } catch (error) {
      console.error("Error updating invoice master:", error);
      throw new Error("Error updating invoice master");
    }
  }

  static async deleteInvoiceMaster(id) {
    try {
      const deletedMaster = await prisma.tblPOSInvoiceMaster.delete({
        where: { id },
      });
      return deletedMaster;
    } catch (error) {
      console.error("Error deleting invoice master:", error);
      throw new Error("Error deleting invoice master");
    }
  }

  static async getAllInvoiceMasters() {
    try {
      const masters = await prisma.tblPOSInvoiceMaster.findMany({});
      return masters;
    } catch (error) {
      console.error("Error fetching all invoice masters:", error);
      throw new Error("Error fetching all invoice masters");
    }
  }

  static async getInvoiceMasterByField(field, value) {
    try {
      const masters = await prisma.tblPOSInvoiceMaster.findMany({
        where: {
          [field]: value,
        },
      });
      return masters;
    } catch (error) {
      console.error(`Error fetching invoice master by ${field}:`, error);
      throw new Error(`Error fetching invoice master by ${field}`);
    }
  }

  static async getSingleInvoiceMasterByFilter(filter) {
    try {
      const master = await prisma.tblPOSInvoiceMaster.findFirst({
        where: filter,
      });
      return master;
    } catch (error) {
      console.error(`Error fetching invoice master by filter:`, error);
      throw new Error(`Error fetching invoice master by filter`);
    }
  }
  static async getInvoiceMasterByInvoiceNo(invoiceNo) {
    try {
      const invoiceMaster = await prisma.tblPOSInvoiceMaster.findUnique({
        where: {
          InvoiceNo: invoiceNo,
        },
      });
      if (!invoiceMaster) {
        throw new Error(`Invoice with number ${invoiceNo} not found.`);
      }
      return invoiceMaster;
    } catch (error) {
      console.error(
        `Error retrieving invoice master for InvoiceNo ${invoiceNo}:`,
        error
      );
      throw new Error("Could not retrieve invoice master.");
    }
  }
  static async getAllInvoiceDetails() {
    try {
      const details = await prisma.tblPOSInvoiceMaster.findMany({
        orderBy: {
          TransactionDate: "desc",
        },
      });
      return details;
    } catch (error) {
      console.error("Error fetching all invoice details:", error);
      throw new Error("Error fetching all invoice details");
    }
  }
  static async getAllInvoiceDetails(sortFields = {}) {
    try {
      // Construct orderBy object based on the sortFields
      const orderBy = [];

      // Loop over the passed fields to set up the orderBy array
      for (const [field, order] of Object.entries(sortFields)) {
        orderBy.push({ [field]: order });
      }

      // If no sorting fields are provided, default to sorting by TransactionDate descending
      if (orderBy.length === 0) {
        orderBy.push({ TransactionDate: "desc" });
      }

      // Fetch the invoice details with the appropriate sorting
      const details = await prisma.tblPOSInvoiceMaster.findMany({
        orderBy,
      });

      return details;
    } catch (error) {
      console.error("Error fetching all invoice details:", error);
      throw new Error("Error fetching all invoice details");
    }
  }
}

module.exports = POSInvoiceMaster;
