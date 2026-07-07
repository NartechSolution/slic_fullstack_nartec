const jwt = require("jsonwebtoken");
require("dotenv").config();

const CustomError = require("../exceptions/customError");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    const error = new CustomError("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      const error = new CustomError("Token has expired.");
      error.statusCode = 401;
      throw error;
    } else {
      err.statusCode = 500;
      err.message = "Failed to authenticate token.";
      throw err;
    }
  }

  if (!decodedToken) {
    const error = new CustomError("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }

  // Store supplier information in request
  req.supplierId = decodedToken.userId;
  req.email = decodedToken.email;

  next();
};
