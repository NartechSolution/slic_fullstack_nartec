const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || "7d"; // Default 7 days

/**
 * Generate access token for supplier
 * @param {string} supplierId - Supplier ID
 * @param {string} email - Supplier email
 * @returns {string} - Signed JWT token
 */
function generateAccessToken(supplierId, email) {
  try {
    const token = jwt.sign(
      {
        userId: supplierId,
        email: email,
      },
      JWT_SECRET,
      {
        expiresIn: TOKEN_EXPIRATION,
      }
    );
    return token;
  } catch (error) {
    throw new Error(`Error generating access token: ${error.message}`);
  }
}

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded token payload
 */
function verifyAccessToken(token) {
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    return decodedToken;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    }
    throw new Error(`Error verifying token: ${error.message}`);
  }
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
