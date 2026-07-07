const prisma = require("../db");
class Lanaguage {
    // Fetch all records
    static async fetchAll() {
        try {
          return await prisma.languages.findMany();
        } catch (error) {
          console.error("Failed to retrieve records from languages:", error);
          throw error;
        }
      }

      static async fortable() {
        try {
          return await prisma.languages.findMany();
        } catch (error) {
          console.error(
           
            error
          );
          throw error;
        }
      }
      static async create(data) {
        try {
          return await prisma.languages.create({
            data: data,
          });
        } catch (error) {
          console.error("Failed to create a new record in tblFSOMaster:", error);
          throw error;
        }
      }
      static async update(id, data) {
        try {
          return await prisma.languages.update({
            where: { id: id },
            data: data,
          });
        } catch (error) {
          console.error(
            `Failed to update record with SO_NUMBER ${id}:`,
            error
          );
          throw error;
        }
      }
  }
module.exports = Lanaguage;