const prisma = require("../db");

async function getBarSeriesNo(id) {
  try {
    const barSeriesNo = await prisma.tblBarSeriesNo.findUnique({
      where: { TblSysNoID: id },
    });
    return barSeriesNo;
  } catch (error) {
    console.error("Error retrieving BarSeriesNo:", error);
    throw error;
  }
}

async function updateBarSeriesNo(id, newBarSeriesNo) {
  try {
    const updatedBarSeriesNo = await prisma.tblBarSeriesNo.update({
      where: { TblSysNoID: id },
      data: { BarSeriesNo: newBarSeriesNo },
    });
    return updatedBarSeriesNo;
  } catch (error) {
    console.error("Error updating BarSeriesNo:", error);
    throw error;
  }
}

module.exports = {
  getBarSeriesNo,
  updateBarSeriesNo,
};
