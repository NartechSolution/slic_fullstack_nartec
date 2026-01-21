const { body } = require("express-validator");

exports.createControlSerials = [
  body("ItemCode")
    .notEmpty()
    .withMessage("ItemCode is required.")
    .isString()
    .withMessage("ItemCode must be a string."),

  body("supplierId")
    .notEmpty()
    .withMessage("Supplier ID is required.")
    .isString()
    .withMessage("Supplier ID must be a string."),

  body("poNumber")
    .notEmpty()
    .withMessage("PO Number is required.")
    .isString()
    .withMessage("PO Number must be a string."),

  body("sizeQuantities")
    .isArray({ min: 1 })
    .withMessage("sizeQuantities must be an array with at least 1 item."),

  body("sizeQuantities.*.qty")
    .notEmpty()
    .withMessage("Each item must have a quantity.")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Quantity must be an integer between 1 and 10000."),

  body("sizeQuantities.*.size")
    .notEmpty()
    .withMessage("Each item must have a size.")
    .isString()
    .withMessage("Size must be a string."),
];

exports.updateControlSerial = [
  body("ItemCode")
    .optional()
    .isString()
    .withMessage("ItemCode must be a string."),

  body("size").optional().isString().withMessage("Size must be a string."),

  body("poNumber")
    .optional()
    .isString()
    .withMessage("PO Number must be a string."),

  body("supplierId")
    .optional()
    .isString()
    .withMessage("Supplier ID must be a string."),

  body("binLocationId")
    .optional({ nullable: true })
    .isString()
    .withMessage("Bin Location ID must be a string."),

  body("isSentToSupplier")
    .optional()
    .isBoolean()
    .withMessage("isSentToSupplier must be a boolean."),

  body("isArchived")
    .optional()
    .isBoolean()
    .withMessage("isArchived must be a boolean."),
    
];

exports.updateSizeByPO = [
  body("poNumber")
    .notEmpty()
    .isString()
    .withMessage("PO Number is required and must be a string."),

  body("oldSize")
    .notEmpty()
    .isString()
    .withMessage("Old size is required and must be a string."),

  body("newSize")
    .notEmpty()
    .isString()
    .withMessage("New size is required and must be a string.")
];


exports.updateControlSerialsByPoNumber = [
  body("poNumber")
    .notEmpty()
    .withMessage("PO Number is required.")
    .isString()
    .withMessage("PO Number must be a string."),

  body("size")
    .notEmpty()
    .withMessage("Size is required.")
    .isString()
    .withMessage("Size must be a string."),

  body("binLocationId")
    .optional({ nullable: true })
    .isString()
    .withMessage("Bin Location ID must be a string."),
];
