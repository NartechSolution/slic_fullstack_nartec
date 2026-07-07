const CustomError = require("../exceptions/customError");
const prisma = require("../db");

const findLocations = async () => {
  try {
    const locations = await prisma.tblLocationNames.findMany();
    return locations;
  } catch (error) {
    throw new CustomError("Failed to retrieve locations:", error);
  }
};

const findCompanies = async () => {
  try {
    const companies = await prisma.tblCompanyNames.findMany();
    return companies;
  } catch (error) {
    throw new CustomError("Failed to retrieve companies:", error);
  }
};

module.exports = {
  findLocations,
  findCompanies,
};
