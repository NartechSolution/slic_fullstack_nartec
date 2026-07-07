const { hashPassword, comparePassword } = require("../utils/passwordManager");
const { generateAccessToken } = require("../utils/tokenManager");
const CustomError = require("../exceptions/customError");
const prisma = require("../db");

/**
 * Get supplier by email
 * @param {string} email - Supplier email
 * @returns {Promise<object>} - Supplier object or null
 */
async function getSupplierByEmail(email) {
  try {
    const supplier = await prisma.supplier.findFirst({
      where: { email: email },
    });
    return supplier;
  } catch (error) {
    console.error("Error fetching supplier by email:", error.message || error);
    throw new CustomError("Error fetching supplier by email");
  }
}

/**
 * Get supplier by ID
 * @param {string} id - Supplier ID
 * @returns {Promise<object>} - Supplier object or null
 */
async function getSupplierById(id) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: id },
      include: {
        controlSerials: true,
      },
    });
    return supplier;
  } catch (error) {
    console.error("Error fetching supplier by ID:", error.message || error);
    throw new CustomError("Error fetching supplier by ID");
  }
}

/**
 * Create a new supplier (registration)
 * @param {string} name - Supplier name
 * @param {string} email - Supplier email
 * @param {string} password - Plain text password
 * @returns {Promise<object>} - Created supplier object with token
 */
async function createSupplier(name, email, password) {
  try {
    // Check if supplier already exists
    const existingSupplier = await getSupplierByEmail(email);
    if (existingSupplier) {
      const error = new CustomError("Supplier with this email already exists");
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create supplier with pending status
    const newSupplier = await prisma.supplier.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        status: "pending", // Default status
      },
    });

    // Generate token
    const token = generateAccessToken(newSupplier.id, newSupplier.email);

    return {
      token,
      supplier: {
        id: newSupplier.id,
        name: newSupplier.name,
        email: newSupplier.email,
        status: newSupplier.status,
        createdAt: newSupplier.createdAt,
      },
    };
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    console.error("Error creating supplier:", error);
    throw new Error("Error creating supplier");
  }
}

/**
 * Supplier login
 * @param {string} email - Supplier email
 * @param {string} password - Plain text password
 * @returns {Promise<object>} - Token and supplier data
 */
async function loginSupplier(email, password) {
  try {
    const supplier = await getSupplierByEmail(email);

    if (!supplier) {
      const error = new CustomError("Invalid email or password");
      error.statusCode = 404;
      throw error;
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, supplier.password);
    if (!isPasswordValid) {
      const error = new CustomError("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    // Generate token
    const token = generateAccessToken(supplier.id, supplier.email);

    return {
      token,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        status: supplier.status,
        createdAt: supplier.createdAt,
      },
    };
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw error;
  }
}

/**
 * Get all suppliers with pagination
 * @param {number} skip - Number of records to skip
 * @param {number} take - Number of records to take
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<object>} - Suppliers and total count
 */
async function getAllSuppliers(skip = 0, take = 10, status = null) {
  try {
    const where = status ? { status: status } : {};

    const suppliers = await prisma.supplier.findMany({
      where: where,
      skip: skip,
      take: take,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalCount = await prisma.supplier.count({ where: where });

    return {
      suppliers,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
    };
  } catch (error) {
    console.error("Error fetching suppliers:", error.message || error);
    throw new CustomError("Error fetching suppliers");
  }
}

/**
 * Update supplier
 * @param {string} id - Supplier ID
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Updated supplier object
 */
async function updateSupplier(id, updateData) {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return supplier;
  } catch (error) {
    if (error.code === "P2025") {
      const customError = new CustomError("Supplier not found");
      customError.statusCode = 404;
      throw customError;
    }
    console.error("Error updating supplier:", error.message || error);
    throw new CustomError("Error updating supplier");
  }
}

/**
 * Delete supplier
 * @param {string} id - Supplier ID
 * @returns {Promise<object>} - Deleted supplier object
 */
async function deleteSupplier(id) {
  try {
    const supplier = await prisma.supplier.delete({
      where: { id: id },
    });
    return supplier;
  } catch (error) {
    if (error.code === "P2025") {
      const customError = new CustomError("Supplier not found");
      customError.statusCode = 404;
      throw customError;
    }
    console.error("Error deleting supplier:", error.message || error);
    throw new CustomError("Error deleting supplier");
  }
}

/**
 * Update supplier status (approve/reject)
 * @param {string} id - Supplier ID
 * @param {string} status - New status (approved/rejected/pending)
 * @returns {Promise<object>} - Updated supplier object
 */
async function updateSupplierStatus(id, status) {
  try {
    if (!["pending", "approved", "rejected"].includes(status)) {
      const error = new CustomError(
        "Invalid status. Must be one of: pending, approved, rejected"
      );
      error.statusCode = 400;
      throw error;
    }

    const supplier = await prisma.supplier.update({
      where: { id: id },
      data: { status: status },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return supplier;
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    if (error.code === "P2025") {
      const customError = new CustomError("Supplier not found");
      customError.statusCode = 404;
      throw customError;
    }
    console.error("Error updating supplier status:", error.message || error);
    throw new CustomError("Error updating supplier status");
  }
}

module.exports = {
  getSupplierByEmail,
  getSupplierById,
  createSupplier,
  loginSupplier,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
  updateSupplierStatus,
};
