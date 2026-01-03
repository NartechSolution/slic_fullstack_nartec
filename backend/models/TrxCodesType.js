// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

// const CustomError = require("../exceptions/customError");

// class TrxCodesType {
//   static async fetchAll() {
//     try {
//       const trxCodes = await prisma.trxCodesType.findMany();
//       return trxCodes;
//     } catch (error) {
//       throw new CustomError("Error fetching transaction codes");
//     }
//   }

//   static async findByCode(code) {
//     try {
//       const trxCode = await prisma.trxCodesType.findUnique({
//         where: { code: code },
//       });
//       return trxCode;
//     } catch (error) {
//       throw new CustomError(`Error finding transaction code: ${code}`);
//     }
//   }

//   static async bulkCreate(codesList) {
//     try {
//       const createdCodes = await prisma.trxCodesType.createMany({
//         data: codesList,
//         skipDuplicates: true,
//       });
//       return createdCodes;
//     } catch (error) {
//       throw new CustomError("Error creating transaction codes in bulk");
//     }
//   }

//   static async upsert(code, data) {
//     try {
//       const upsertedCode = await prisma.trxCodesType.upsert({
//         where: { code: code },
//         update: data,
//         create: { ...data, code: code },
//       });
//       return upsertedCode;
//     } catch (error) {
//       throw new CustomError(`Error upserting transaction code: ${code}`);
//     }
//   }

//   static async deleteByCode(code) {
//     try {
//       await prisma.trxCodesType.delete({
//         where: { code: code },
//       });
//     } catch (error) {
//       throw new CustomError(`Error deleting transaction code: ${code}`);
//     }
//   }
// }

// module.exports = TrxCodesType;

const CustomError = require("../exceptions/customError");
const prisma = require("../db");

class TrxCodesType {
  static async fetchAll() {
    try {
      const trxCodes = await prisma.trxCodesType.findMany();
      return trxCodes;
    } catch (error) {
      console.log(error);
      throw new CustomError("Error fetching transaction codes");
    }
  }

  static async fetchFiltered(filters) {
    try {
      // Build the where clause dynamically based on the filters
      const whereClause = {};

      if (filters.TXN_CODE) whereClause.TXN_CODE = filters.TXN_CODE;
      if (filters.TXN_NAME) whereClause.TXN_NAME = filters.TXN_NAME;
      if (filters.TXN_TYPE) whereClause.TXN_TYPE = filters.TXN_TYPE;
      if (filters.TXNLOCATIONCODE)
        whereClause.TXNLOCATIONCODE = filters.TXNLOCATIONCODE;
      if (filters.CUSTOMERCODE) whereClause.CUSTOMERCODE = filters.CUSTOMERCODE;

      const trxCodes = await prisma.trxCodesType.findMany({
        where: whereClause,
      });

      return trxCodes;
    } catch (error) {
      console.log(error);
      throw new CustomError("Error fetching filtered transaction codes");
    }
  }

  static async findByCode(code) {
    try {
      const trxCode = await prisma.trxCodesType.findUnique({
        where: { TXN_CODE: code },
      });
      return trxCode;
    } catch (error) {
      throw new CustomError(`Error finding transaction code: ${code}`);
    }
  }

  static async bulkCreate(codesList) {
    try {
      const { randomUUID } = require("crypto");
      let createdCount = 0;

      for (const code of codesList) {
        // Check if a record with this TXN_CODE already exists
        const existing = await prisma.trxCodesType.findFirst({
          where: { TXN_CODE: code.TXN_CODE },
        });

        if (!existing) {
          // Create new record with generated id
          await prisma.trxCodesType.create({
            data: {
              id: randomUUID(),
              ...code,
            },
          });
          createdCount++;
        }
      }
      return { count: createdCount };
    } catch (error) {
      throw new CustomError(error);
    }
  }

  static async upsert(code, data) {
    try {
      const upsertedCode = await prisma.trxCodesType.upsert({
        where: { TXN_CODE: code },
        update: data,
        create: { ...data, TXN_CODE: code },
      });
      return upsertedCode;
    } catch (error) {
      throw new CustomError(`Error upserting transaction code: ${code}`);
    }
  }

  static async deleteByCode(code) {
    try {
      await prisma.trxCodesType.delete({
        where: { TXN_CODE: code },
      });
    } catch (error) {
      throw new CustomError(`Error deleting transaction code: ${code}`);
    }
  }

  static async filterByLocationCode(locationCode) {
    try {
      const trxCodes = await prisma.trxCodesType.findMany({
        where: {
          TXNLOCATIONCODE: locationCode,
        },
      });
      return trxCodes;
    } catch (error) {
      throw new CustomError(
        `Error fetching transaction codes for location code: ${locationCode}`
      );
    }
  }
}

module.exports = TrxCodesType;
