const { validationResult } = require("express-validator");

const User = require("../models/TblUsers");
const response = require("../utils/response");
const CustomError = require("../exceptions/customError");


exports.signup = async (req, res, next) => {
  const { userLoginID, userPassword } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new Error(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    // Check if this email already exists or not
    const existingUser = await User.getUserByLoginId(userLoginID);
    if (existingUser) {
      const error = new CustomError("User already exists");
      error.statusCode = 409;
      throw error;
    }

    const user = await User.createUser(userLoginID, userPassword);
    if (!user) {
      const error = new CustomError("User not found");
      error.statusCode = 404;
      throw error;
    }
    res
      .status(200)
      .json(response(201, true, "New user created successfully", user));
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { userLoginID, userPassword } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const user = await User.loginUser(userLoginID, userPassword);

    res.status(200).json(response(200, true, "Login successful", user));
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  const { userLoginID } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new CustomError(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const token = await User.verifyEmail(userLoginID);
    if (!token) {
      const error = new CustomError("Email verification failed");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(response(200, true, "Email verified successfully", token));
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  const { userLoginID, newPassword } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new Error(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    if (req.email != userLoginID) {
      const error = new CustomError(
        "You are not authorized to reset password for this user"
      );
      error.statusCode = 401;
      throw error;
    }

    const updatedUser = await User.resetPassword(userLoginID, newPassword);
    if (!updatedUser) {
      const error = new CustomError("Reset Password failed");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(response(200, true, "Password reset successfully"));
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new Error(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const updatedUser = await User.logoutUser(req.email);
    if (!updatedUser) {
      const error = new CustomError("Failed to logout");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(response(200, true, "User logged out successfully", updatedUser));
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.fetchAll();
    if (!users) {
      const error = new CustomError("No users found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(response(200, true, "Users found", users));
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.errors[0].msg;
      const error = new Error(msg);
      error.statusCode = 422;
      error.data = errors;
      return next(error);
    }

    const updatedUser = await User.updateUser(id, req.body);
    if (!updatedUser) {
      const error = new CustomError("An error has occurred while updating");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(response(200, true, "User updated successfully", updatedUser));
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.getUserById(id);
    if (!user) {
      const error = new CustomError("User not found");
      error.statusCode = 404;
      throw error;
    }
    const deletedUser = await User.deleteUser(id);
    if (!deletedUser) {
      const error = new CustomError("An error has occurred while deleting");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(response(200, true, "User deleted successfully", deletedUser));
  } catch (error) {
    next(error);
  }
};
