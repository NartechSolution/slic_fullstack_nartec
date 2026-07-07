const { validationResult } = require("express-validator");
const Supplier = require("../models/supplier");
const response = require("../utils/response");
const CustomError = require("../exceptions/customError");
const {
  sendSupplierStatusNotificationEmail,
} = require("../utils/emailManager");

/**
 * Register a new supplier
 * POST /api/suppliers/register
 */
exports.registerSupplier = async (req, res, next) => {
  const { name, email, password } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new Error(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const result = await Supplier.createSupplier(name, email, password);

    res.status(201).json(
      response(201, true, "Supplier registered successfully", result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login supplier
 * POST /api/suppliers/login
 */
exports.loginSupplier = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const result = await Supplier.loginSupplier(email, password);

    res.status(200).json(
      response(200, true, "Supplier login successful", result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all suppliers
 * GET /api/suppliers
 */
exports.getAllSuppliers = async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const status = req.query.status || null;

    const skip = (page - 1) * limit;

    const result = await Supplier.getAllSuppliers(skip, limit, status);

    res.status(200).json(
      response(200, true, "Suppliers retrieved successfully", result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get supplier by ID
 * GET /api/suppliers/:id
 */
exports.getSupplierById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const supplier = await Supplier.getSupplierById(id);

    if (!supplier) {
      const error = new CustomError("Supplier not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json(
      response(200, true, "Supplier retrieved successfully", supplier)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update supplier
 * PUT /api/suppliers/:id
 */
exports.updateSupplier = async (req, res, next) => {
  const { id } = req.params;
  const { name, email } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      const error = new CustomError("No fields to update");
      error.statusCode = 400;
      return next(error);
    }

    const supplier = await Supplier.updateSupplier(id, updateData);

    res.status(200).json(
      response(200, true, "Supplier updated successfully", supplier)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete supplier
 * DELETE /api/suppliers/:id
 */
exports.deleteSupplier = async (req, res, next) => {
  const { id } = req.params;
  try {
    const supplier = await Supplier.deleteSupplier(id);

    res.status(200).json(
      response(200, true, "Supplier deleted successfully", supplier)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject supplier
 * PUT /api/suppliers/:id/status
 */
exports.updateSupplierStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const supplier = await Supplier.updateSupplierStatus(id, status);

    // Send email notification to supplier about status change
    try {
      const emailResult = await sendSupplierStatusNotificationEmail({
        supplierEmail: supplier.email,
        supplierName: supplier.name,
        status: supplier.status,
      });

      console.log("Email notification result:", emailResult);
    } catch (emailError) {
      console.error("Error sending email notification:", emailError);
      // Don't fail the operation if email sending fails
    }

    res.status(200).json(
      response(200, true, "Supplier status updated successfully", supplier)
    );
  } catch (error) {
    next(error);
  }
};
