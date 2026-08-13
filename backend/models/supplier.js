const crypto = require("crypto");
const { hashPassword, comparePassword } = require("../utils/passwordManager");
const { generateAccessToken } = require("../utils/tokenManager");
const CustomError = require("../exceptions/customError");
const prisma = require("../db");

// Password reset (email OTP) settings
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10; // how long an OTP stays valid
const OTP_MAX_ATTEMPTS = 5; // wrong tries allowed before the OTP is burned
const OTP_RESEND_COOLDOWN_SECONDS = 60; // gap enforced between two OTP emails
const RESET_TOKEN_EXPIRY_MINUTES = 15; // window to set the new password

/**
 * Generate a cryptographically random numeric OTP
 * @returns {string} - OTP of OTP_LENGTH digits (leading zeros preserved)
 */
function generateOtp() {
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

/**
 * Hash a reset token so it is never stored in plain text
 * @param {string} token - Plain token
 * @returns {string} - sha256 hex digest
 */
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Clear every password reset related field of a supplier
 * @param {string} id - Supplier ID
 * @param {object} extraData - Additional fields to update in the same query
 * @returns {Promise<object>} - Updated supplier
 */
async function clearResetState(id, extraData = {}) {
  return prisma.supplier.update({
    where: { id: id },
    data: {
      ...extraData,
      resetOtp: null,
      resetOtpExpiresAt: null,
      resetOtpAttempts: 0,
      resetOtpSentAt: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });
}

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
      // Explicit select so the password hash and password reset fields are
      // never exposed through the API
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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

/**
 * Create (or refresh) a password reset OTP for a supplier
 * @param {string} email - Supplier email
 * @returns {Promise<object>} - Supplier, the plain OTP and its expiry in minutes
 */
async function createPasswordResetOtp(email) {
  const supplier = await getSupplierByEmail(email);

  if (!supplier) {
    const error = new CustomError("No supplier account found with this email");
    error.statusCode = 404;
    throw error;
  }

  // Throttle how often an OTP email can be requested
  if (supplier.resetOtpSentAt) {
    const secondsSinceLastOtp =
      (Date.now() - new Date(supplier.resetOtpSentAt).getTime()) / 1000;

    if (secondsSinceLastOtp < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitFor = Math.ceil(
        OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastOtp
      );
      const error = new CustomError(
        `Please wait ${waitFor} second(s) before requesting another code`
      );
      error.statusCode = 429;
      error.retryAfter = waitFor;
      throw error;
    }
  }

  const otp = generateOtp();
  const hashedOtp = await hashPassword(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  try {
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        resetOtp: hashedOtp,
        resetOtpExpiresAt: expiresAt,
        resetOtpAttempts: 0,
        resetOtpSentAt: new Date(),
        // A freshly requested OTP invalidates any previously issued token
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  } catch (error) {
    console.error("Error saving password reset OTP:", error.message || error);
    throw new CustomError("Error generating verification code");
  }

  return {
    supplier: supplier,
    otp: otp,
    expiryMinutes: OTP_EXPIRY_MINUTES,
  };
}

/**
 * Verify a password reset OTP and issue a short lived reset token
 * @param {string} email - Supplier email
 * @param {string} otp - Plain OTP entered by the supplier
 * @returns {Promise<object>} - Reset token and its expiry in minutes
 */
async function verifyPasswordResetOtp(email, otp) {
  const supplier = await getSupplierByEmail(email);

  if (!supplier || !supplier.resetOtp || !supplier.resetOtpExpiresAt) {
    const error = new CustomError(
      "No verification code was requested for this email"
    );
    error.statusCode = 400;
    throw error;
  }

  if (new Date(supplier.resetOtpExpiresAt).getTime() < Date.now()) {
    await clearResetState(supplier.id);
    const error = new CustomError(
      "The verification code has expired. Please request a new one"
    );
    error.statusCode = 400;
    throw error;
  }

  if (supplier.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
    await clearResetState(supplier.id);
    const error = new CustomError(
      "Too many invalid attempts. Please request a new verification code"
    );
    error.statusCode = 429;
    throw error;
  }

  const isOtpValid = await comparePassword(otp, supplier.resetOtp);

  if (!isOtpValid) {
    const attempts = supplier.resetOtpAttempts + 1;

    if (attempts >= OTP_MAX_ATTEMPTS) {
      await clearResetState(supplier.id);
      const error = new CustomError(
        "Too many invalid attempts. Please request a new verification code"
      );
      error.statusCode = 429;
      throw error;
    }

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { resetOtpAttempts: attempts },
    });

    const error = new CustomError(
      `Invalid verification code. ${
        OTP_MAX_ATTEMPTS - attempts
      } attempt(s) remaining`
    );
    error.statusCode = 400;
    throw error;
  }

  // OTP is correct: burn it and hand out a single use reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  await prisma.supplier.update({
    where: { id: supplier.id },
    data: {
      resetOtp: null,
      resetOtpExpiresAt: null,
      resetOtpAttempts: 0,
      resetToken: hashResetToken(resetToken),
      resetTokenExpiresAt: new Date(
        Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
      ),
    },
  });

  return {
    resetToken: resetToken,
    expiryMinutes: RESET_TOKEN_EXPIRY_MINUTES,
    email: supplier.email,
  };
}

/**
 * Set a new password using a verified reset token
 * @param {string} email - Supplier email
 * @param {string} resetToken - Token returned by verifyPasswordResetOtp
 * @param {string} newPassword - New plain text password
 * @returns {Promise<object>} - Updated supplier (safe fields only)
 */
async function resetPasswordWithToken(email, resetToken, newPassword) {
  const supplier = await getSupplierByEmail(email);

  if (!supplier || !supplier.resetToken || !supplier.resetTokenExpiresAt) {
    const error = new CustomError(
      "Invalid or expired reset request. Please start again"
    );
    error.statusCode = 400;
    throw error;
  }

  if (new Date(supplier.resetTokenExpiresAt).getTime() < Date.now()) {
    await clearResetState(supplier.id);
    const error = new CustomError(
      "Your reset session has expired. Please start again"
    );
    error.statusCode = 400;
    throw error;
  }

  if (hashResetToken(resetToken) !== supplier.resetToken) {
    const error = new CustomError(
      "Invalid or expired reset request. Please start again"
    );
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(newPassword);

  const updated = await clearResetState(supplier.id, {
    password: hashedPassword,
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    status: updated.status,
  };
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
  createPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
};
