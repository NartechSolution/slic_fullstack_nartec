const { sendTemplateEmail } = require("../config/email");
const CustomError = require("../exceptions/customError");

/**
 * Send supplier status notification email
 * Sends an email to the supplier when their account status is updated (approved/rejected)
 *
 * @param {Object} options - Email options
 * @param {string} options.supplierEmail - Supplier's email address
 * @param {string} options.supplierName - Supplier's company name
 * @param {string} options.status - New status (approved/rejected)
 * @param {string} [options.reason] - Rejection reason (optional, for rejected status)
 * @returns {Promise<Object>} - Email send result
 * @throws {CustomError} - If email sending fails
 */
async function sendSupplierStatusNotificationEmail(options) {
  const { supplierEmail, supplierName, status, reason } = options;

  // Validate required parameters
  if (!supplierEmail || !supplierName || !status) {
    const error = new CustomError(
      "Missing required parameters for email notification"
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate status
  if (!["approved", "rejected"].includes(status)) {
    const error = new CustomError(
      "Invalid status. Must be 'approved' or 'rejected'"
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    // Prepare email subject based on status
    let subject;
    if (status === "approved") {
      subject = "✓ Your SLIC Supplier Account Has Been Approved";
    } else if (status === "rejected") {
      subject = "✗ Your SLIC Supplier Account Application";
    }

    // Prepare template data
    const templateData = {
      supplierName: supplierName,
      supplierEmail: supplierEmail,
      status: status,
      reason: reason || null,
    };

    // Send the email
    const emailOptions = {
      to: supplierEmail,
      subject: subject,
      template: "supplierStatusNotification",
      data: templateData,
    };

    const result = await sendTemplateEmail(emailOptions);

    console.log(`[Email Manager] Supplier status notification sent to ${supplierEmail}`);
    console.log(`[Email Manager] Message ID: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      recipient: supplierEmail,
      status: status,
    };
  } catch (error) {
    console.error(
      `[Email Manager] Failed to send supplier status notification to ${supplierEmail}:`,
      error.message || error
    );

    // Log but don't throw - we want the status update to succeed even if email fails
    // The email failure should be logged but not prevent the operation
    return {
      success: false,
      error: error.message,
      recipient: supplierEmail,
      status: status,
    };
  }
}

/**
 * Send supplier registration confirmation email
 * Sends an email to the supplier when they register
 *
 * @param {Object} options - Email options
 * @param {string} options.supplierEmail - Supplier's email address
 * @param {string} options.supplierName - Supplier's company name
 * @returns {Promise<Object>} - Email send result
 * @throws {CustomError} - If email sending fails
 */
async function sendSupplierRegistrationEmail(options) {
  const { supplierEmail, supplierName } = options;

  // Validate required parameters
  if (!supplierEmail || !supplierName) {
    const error = new CustomError(
      "Missing required parameters for registration email"
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    const subject = "Welcome to SLIC - Registration Confirmation";

    const templateData = {
      supplierName: supplierName,
      supplierEmail: supplierEmail,
    };

    const emailOptions = {
      to: supplierEmail,
      subject: subject,
      template: "supplierRegistrationConfirmation",
      data: templateData,
    };

    const result = await sendTemplateEmail(emailOptions);

    console.log(`[Email Manager] Registration confirmation sent to ${supplierEmail}`);
    console.log(`[Email Manager] Message ID: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      recipient: supplierEmail,
      type: "registration",
    };
  } catch (error) {
    console.error(
      `[Email Manager] Failed to send registration email to ${supplierEmail}:`,
      error.message || error
    );

    return {
      success: false,
      error: error.message,
      recipient: supplierEmail,
      type: "registration",
    };
  }
}

/**
 * Send admin notification about new supplier registration
 * Sends an email to admin when a new supplier registers
 *
 * @param {Object} options - Email options
 * @param {string} options.adminEmail - Admin's email address
 * @param {string} options.supplierName - Supplier's company name
 * @param {string} options.supplierEmail - Supplier's email address
 * @param {string} options.supplierId - Supplier's ID for dashboard link
 * @returns {Promise<Object>} - Email send result
 */
async function sendAdminNewSupplierNotificationEmail(options) {
  const { adminEmail, supplierName, supplierEmail, supplierId } = options;

  // Validate required parameters
  if (!adminEmail || !supplierName || !supplierEmail || !supplierId) {
    const error = new CustomError(
      "Missing required parameters for admin notification"
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    const subject = `[SLIC] New Supplier Registration: ${supplierName}`;

    const templateData = {
      supplierName: supplierName,
      supplierEmail: supplierEmail,
      supplierId: supplierId,
      registrationTime: new Date().toLocaleString(),
    };

    const emailOptions = {
      to: adminEmail,
      subject: subject,
      template: "adminNewSupplierNotification",
      data: templateData,
    };

    const result = await sendTemplateEmail(emailOptions);

    console.log(`[Email Manager] Admin notification sent to ${adminEmail}`);
    console.log(`[Email Manager] Message ID: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      recipient: adminEmail,
      type: "admin_notification",
    };
  } catch (error) {
    console.error(
      `[Email Manager] Failed to send admin notification to ${adminEmail}:`,
      error.message || error
    );

    return {
      success: false,
      error: error.message,
      recipient: adminEmail,
      type: "admin_notification",
    };
  }
}

/**
 * Send control serial creation notification email
 * Sends an email to the supplier when new control serials are created for their PO
 *
 * @param {Object} options - Email options
 * @param {string} options.supplierEmail - Supplier's email address
 * @param {string} options.supplierName - Supplier's company name
 * @param {string} options.poNumber - Purchase Order number
 * @param {string} options.itemCode - Item code for which serials were created
 * @param {number} options.quantity - Number of serials created
 * @param {string} [options.size] - Size of the items (optional)
 * @returns {Promise<Object>} - Email send result
 */
async function sendControlSerialNotificationEmail(options) {
  const { supplierEmail, supplierName, poNumber, itemCode, quantity, size, baseUrl } =
    options;

  // Validate required parameters
  if (!supplierEmail || !supplierName || !poNumber || !itemCode || !quantity) {
    console.error(
      "[Email Manager] Missing required parameters for control serial notification"
    );
    return {
      success: false,
      error: "Missing required parameters",
      recipient: supplierEmail,
      type: "control_serial_notification",
    };
  }

  try {
    // Prepare email subject
    const subject = `✓ New Control Serials Created - PO: ${poNumber}`;

    // Prepare template data
    const templateData = {
      supplierName: supplierName,
      supplierEmail: supplierEmail,
      poNumber: poNumber,
      itemCode: itemCode,
      quantity: quantity,
      size: size || null,
      baseUrl: baseUrl,
    };

    console.log(
      `[Email Manager] Sending control serial notification to ${supplierEmail} for PO ${poNumber}`
    );

    // Send email using the template
    const result = await sendTemplateEmail({
      to: supplierEmail,
      subject: subject,
      template: "controlSerialNotification",
      data: templateData,
    });

    console.log(
      `[Email Manager] Control serial notification sent successfully to ${supplierEmail}`
    );
    console.log(`[Email Manager] Message ID: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      recipient: supplierEmail,
      poNumber: poNumber,
      quantity: quantity,
      type: "control_serial_notification",
    };
  } catch (error) {
    console.error(
      `[Email Manager] Failed to send control serial notification to ${supplierEmail}:`,
      error.message || error
    );

    return {
      success: false,
      error: error.message,
      recipient: supplierEmail,
      type: "control_serial_notification",
    };
  }
}

module.exports = {
  sendSupplierStatusNotificationEmail,
  sendSupplierRegistrationEmail,
  sendAdminNewSupplierNotificationEmail,
  sendControlSerialNotificationEmail,
};
