const prisma = require("../db");

class POSInvoiceDetails {
  static async getInvoiceDetailsById(id) {
    try {
      const details = await prisma.tblPOSInvoiceDetails.findUnique({
        where: { id },
      });
      return details;
    } catch (error) {
      console.error("Error fetching invoice details by ID:", error);
      throw new Error("Error fetching invoice details by ID");
    }
  }

  static async createInvoiceDetails(data) {
    try {
      const newDetails = await prisma.tblPOSInvoiceDetails.create({
        data,
      });
      return newDetails;
    } catch (error) {
      console.error("Error creating invoice details:", error);
      throw new Error("Error creating invoice details");
    }
  }

  static async updateInvoiceDetails(id, data) {
    try {
      const updatedDetails = await prisma.tblPOSInvoiceDetails.update({
        where: { id },
        data,
      });
      return updatedDetails;
    } catch (error) {
      console.error("Error updating invoice details:", error);
      throw new Error("Error updating invoice details");
    }
  }

  static async deleteInvoiceDetails(id) {
    try {
      const deletedDetails = await prisma.tblPOSInvoiceDetails.delete({
        where: { id },
      });
      return deletedDetails;
    } catch (error) {
      console.error("Error deleting invoice details:", error);
      throw new Error("Error deleting invoice details");
    }
  }

  static async getAllInvoiceDetails() {
    try {
      const details = await prisma.tblPOSInvoiceDetails.findMany({});
      return details;
    } catch (error) {
      console.error("Error fetching all invoice details:", error);
      throw new Error("Error fetching all invoice details");
    }
  }

  static async getInvoiceDetailsByFilter(filter) {
    try {
      const details = await prisma.tblPOSInvoiceDetails.findMany({
        where: filter,
        orderBy: {
          TransactionDate: "desc", // Sort by TransactionDate in descending order
        },
      });
      return details;
    } catch (error) {
      console.error(`Error fetching invoice details by filter:`, error);
      throw new Error(`Error fetching invoice details by filter`);
    }
  }
  
  static async getDetailsByInvoiceNoAndTransactionCode(
    InvoiceNo,
    TransactionCode
  ) {
    try {
      const details = await prisma.tblPOSInvoiceDetails.findMany({
        where: {
          InvoiceNo: InvoiceNo,
          TransactionCode: TransactionCode,
        },
      });
      return details;
    } catch (error) {
      console.error(`Error fetching invoice details:`, error);
      throw new Error(`Error fetching invoice details`);
    }
  }

  static async getAllInvoiceDetails() {
    try {
      const allInvoices = await prisma.tblPOSInvoiceDetails.findMany();
      return allInvoices;
    } catch (error) {
      console.error("Error retrieving all invoice details:", error);
      throw new Error("Could not retrieve invoice details.");
    }
  }

  static async getInvoiceDetailsByField(field, value) {
    try {
      const masters = await prisma.tblPOSInvoiceDetails.findMany({
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

  static async getInvoiceDetailsByFieldTwo(field, values) {
    try {
      const details = await prisma.tblPOSInvoiceDetails.findMany({
        where: {
          [field]: {
            in: values, // Use Prisma's 'in' operator to filter by multiple values
          },
        },
        orderBy: {
          TransactionDate: "desc", // Sort by TransactionDate in descending order
        },
      });
      return details;
    } catch (error) {
      console.error(`Error fetching invoice details by ${field}:`, error);
      throw new Error(`Error fetching invoice details by ${field}`);
    }
  }
}

module.exports = POSInvoiceDetails;
