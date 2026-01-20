const prisma = require("../db");

class TblSalesExchangeInvoicetmp {
  static async getInvoiceDetailsById(id) {
    try {
      const details = await prisma.tblSalesExchangeInvoicetmp.findUnique({
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
      const newDetails = await prisma.tblSalesExchangeInvoicetmp.create({
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
      const updatedDetails = await prisma.tblSalesExchangeInvoicetmp.update({
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
      const deletedDetails = await prisma.tblSalesExchangeInvoicetmp.delete({
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
      const details = await prisma.tblSalesExchangeInvoicetmp.findMany({});
      return details;
    } catch (error) {
      console.error("Error fetching all invoice details:", error);
      throw new Error("Error fetching all invoice details");
    }
  }

  static async getInvoiceDetailsByField(field, value) {
    try {
      const details = await prisma.tblSalesExchangeInvoicetmp.findMany({
        where: {
          [field]: value,
        },
      });
      return details;
    } catch (error) {
      console.error(`Error fetching invoice details by ${field}:`, error);
      throw new Error(`Error fetching invoice details by ${field}`);
    }
  }

  static async getDetailsByInvoiceNoAndTransactionCode(
    InvoiceNo,
    TransactionCode
  ) {
    try {
      const details = await prisma.tblSalesExchangeInvoicetmp.findMany({
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
}

module.exports = TblSalesExchangeInvoicetmp;
