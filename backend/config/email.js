const dotenv = require("dotenv");
const ejs = require("ejs");
const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");

// Ensure environment variables are loaded
dotenv.config(path.join(__dirname, "..", ".env"));

// Constants for email configuration
const EMAIL_FROM = process.env.EMAIL_FROM || "";
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD || "";

// Debug: Check if environment variables are loaded
console.log("Email auth check:", {
  user: process.env.EMAIL_FROM ? "Email found" : "Missing EMAIL_FROM",
  pass: process.env.EMAIL_APP_PASSWORD
    ? "Password found"
    : "Missing EMAIL_APP_PASSWORD",
});

// Create a nodemailer transporter using Gmail SMTP
const createTransporter = () => {
  // More reliable Gmail configuration
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: EMAIL_FROM,
      pass: EMAIL_APP_PASSWORD,
    },
    debug: true, // Enable debug output
  });

  return transporter;
};

// Create the transporter only once
const transporter = createTransporter();

// Verify the connection
transporter.verify((error) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to send messages");
  }
});

/**
 * Send an email using a template
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name (without extension)
 * @param {Object} options.data - Data to pass to the template
 * @param {string} [options.from] - Sender email address (optional, uses default if not provided)
 * @param {Array<Object>} [options.attachments] - Email attachments
 * @returns {Promise<Object>} - Nodemailer info object
 */
const sendTemplateEmail = async (options) => {
  const { to, subject, template, data, from, attachments } = options;

  // Create the template path
  const templatePath = path.join(
    __dirname,
    "..",
    "view",
    "templates",
    `${template}.ejs`
  );

  try {
    // Check if template exists
    await fs.promises.access(templatePath);

    // Render the template
    const html = await ejs.renderFile(templatePath, data);

    // Send the email
    const mailOptions = {
      from: from || process.env.EMAIL_FROM || "noreply@groute.app",
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (error) {
    console.error("Email Send Error:", error);
    throw error;
  }
};

// Other email functions...

module.exports = {
  transporter,
  sendTemplateEmail,
};
