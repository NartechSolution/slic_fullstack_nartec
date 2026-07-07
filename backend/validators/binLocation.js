const { body } = require("express-validator");

exports.createBinLocation = [
  body("groupWarehouse")
    .optional()
    .isString()
    .withMessage("Group Warehouse must be a string.")
    .isLength({ max: 100 })
    .withMessage("Group Warehouse must not exceed 100 characters."),

  body("zoneCode")
    .optional()
    .isString()
    .withMessage("Zone Code must be a string.")
    .isLength({ max: 50 })
    .withMessage("Zone Code must not exceed 50 characters."),

  body("zones")
    .optional()
    .isString()
    .withMessage("Zones must be a string.")
    .isLength({ max: 100 })
    .withMessage("Zones must not exceed 100 characters."),

  body("zoneName")
    .optional()
    .isString()
    .withMessage("Zone Name must be a string.")
    .isLength({ max: 150 })
    .withMessage("Zone Name must not exceed 150 characters."),

  body("binNumber")
    .optional()
    .isString()
    .withMessage("Bin Number must be a string.")
    .isLength({ max: 50 })
    .withMessage("Bin Number must not exceed 50 characters."),

  body("zoned")
    .optional()
    .isString()
    .withMessage("Zoned must be a string.")
    .isLength({ max: 100 })
    .withMessage("Zoned must not exceed 100 characters."),

  body("zoneType")
    .optional()
    .isString()
    .withMessage("Zone Type must be a string.")
    .isLength({ max: 50 })
    .withMessage("Zone Type must not exceed 50 characters."),

  body("binType")
    .optional()
    .isString()
    .withMessage("Bin Type must be a string.")
    .isLength({ max: 50 })
    .withMessage("Bin Type must not exceed 50 characters."),

  body("binHeight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bin Height must be a positive number."),

  body("binRow")
    .optional()
    .isString()
    .withMessage("Bin Row must be a string.")
    .isLength({ max: 50 })
    .withMessage("Bin Row must not exceed 50 characters."),

  body("binWidth")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bin Width must be a positive number."),

  body("binTotalSize")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bin Total Size must be a positive number."),

  body("gln")
    .optional()
    .isString()
    .withMessage("GLN must be a string.")
    .isLength({ max: 50 })
    .withMessage("GLN must not exceed 50 characters."),

  body("longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180."),

  body("latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90."),

  body("sgln")
    .optional()
    .isString()
    .withMessage("SGLN must be a string.")
    .isLength({ max: 100 })
    .withMessage("SGLN must not exceed 100 characters."),

  body("mapLocation")
    .optional()
    .isString()
    .withMessage("Map Location must be a string.")
    .isLength({ max: 255 })
    .withMessage("Map Location must not exceed 255 characters."),

  body("minQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Min Quantity must be a non-negative integer."),

  body("availableQty")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Available Quantity must be a non-negative integer."),

  body("maxQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Max Quantity must be a non-negative integer."),

  body("capacityUsage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Capacity Usage must be between 0 and 100."),
];

exports.updateBinLocation = [
  body("groupWarehouse")
    .optional()
    .isString()
    .withMessage("Group Warehouse must be a string.")
    .isLength({ max: 100 })
    .withMessage("Group Warehouse must not exceed 100 characters."),

  body("zoneCode")
    .optional()
    .isString()
    .withMessage("Zone Code must be a string.")
    .isLength({ max: 50 })
    .withMessage("Zone Code must not exceed 50 characters."),

  body("zones")
    .optional()
    .isString()
    .withMessage("Zones must be a string.")
    .isLength({ max: 100 })
    .withMessage("Zones must not exceed 100 characters."),

  body("zoneName")
    .optional()
    .isString()
    .withMessage("Zone Name must be a string.")
    .isLength({ max: 150 })
    .withMessage("Zone Name must not exceed 150 characters."),

  body("binNumber")
    .optional()
    .isString()
    .withMessage("Bin Number must be a string.")
    .isLength({ max: 50 })
    .withMessage("Bin Number must not exceed 50 characters."),

  body("zoned")
    .optional()
    .isString()
    .withMessage("Zoned must be a string.")
    .isLength({ max: 100 })
    .withMessage("Zoned must not exceed 100 characters."),

  body("zoneType")
    .optional()
    .isString()
    .withMessage("Zone Type must be a string.")
    .isLength({ max: 50 })
    .withMessage("Zone Type must not exceed 50 characters."),

  body("binType")
    .optional()
    .isString()
    .withMessage("Bin Type must be a string.")
    .isLength({ max: 50 })
    .withMessage("Bin Type must not exceed 50 characters."),

  body("binHeight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bin Height must be a positive number."),

  body("binRow")
    .optional()
    .isString()
    .withMessage("Bin Row must be a string.")
    .isLength({ max: 50 })
    .withMessage("Bin Row must not exceed 50 characters."),

  body("binWidth")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bin Width must be a positive number."),

  body("binTotalSize")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bin Total Size must be a positive number."),

  body("gln")
    .optional()
    .isString()
    .withMessage("GLN must be a string.")
    .isLength({ max: 50 })
    .withMessage("GLN must not exceed 50 characters."),

  body("longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180."),

  body("latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90."),

  body("sgln")
    .optional()
    .isString()
    .withMessage("SGLN must be a string.")
    .isLength({ max: 100 })
    .withMessage("SGLN must not exceed 100 characters."),

  body("mapLocation")
    .optional()
    .isString()
    .withMessage("Map Location must be a string.")
    .isLength({ max: 255 })
    .withMessage("Map Location must not exceed 255 characters."),

  body("minQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Min Quantity must be a non-negative integer."),

  body("availableQty")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Available Quantity must be a non-negative integer."),

  body("maxQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Max Quantity must be a non-negative integer."),

  body("capacityUsage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Capacity Usage must be between 0 and 100."),
];
