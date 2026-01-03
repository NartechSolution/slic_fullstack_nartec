const CustomError = require("../exceptions/customError");
const prisma = require("../db");

class CustomerName {
  static async fetchAll() {
    try {
      const customers = await prisma.tblCustomerNames.findMany();
      return customers;
    } catch (error) {
      throw new CustomError("Error fetching customers");
    }
  }

  static async searchByPartialNameOrCode(query) {
    try {
      const customers = await prisma.tblCustomerNames.findMany({
        where: {
          OR: [
            {
              CUST_CODE: {
                contains: query.toString(),
              },
            },
            {
              CUST_NAME: {
                contains: query.toString(),
              },
            },
          ],
        },
      });
      return customers;
    } catch (error) {
      console.log(error);
      throw new CustomError("Error searching customers");
    }
  }

  static async findByCode(code) {
    try {
      const customer = await prisma.tblCustomerNames.findUnique({
        where: { CUST_CODE: code },
      });
      return customer;
    } catch (error) {
      throw new CustomError(`Error finding customer: ${code}`);
    }
  }

  static async bulkCreate(customersList) {
    try {
      const createdCustomers = await prisma.tblCustomerNames.createMany({
        data: customersList,
      });
      return createdCustomers;
    } catch (error) {
      console.error(error);
      throw new CustomError("Error creating customers in bulk");
    }
  }

  static async upsert(code, data) {
    try {
      const upsertedCustomer = await prisma.tblCustomerNames.upsert({
        where: { CUST_CODE: code },
        update: data,
        create: { ...data, CUST_CODE: code },
      });
      return upsertedCustomer;
    } catch (error) {
      throw new CustomError(`Error upserting customer: ${code}`);
    }
  }

  static async deleteByCode(code) {
    try {
      await prisma.tblCustomerNames.delete({
        where: { CUST_CODE: code },
      });
    } catch (error) {
      throw new CustomError(`Error deleting customer: ${code}`);
    }
  }
}

module.exports = CustomerName;
