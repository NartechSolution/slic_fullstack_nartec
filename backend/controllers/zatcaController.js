const { validationResult, checkSchema } = require("express-validator");
const crypto = require("crypto");
const { Base64 } = require("js-base64");
const fs = require("fs");
const ecdsa = require("elliptic").ec;
const ec = new ecdsa("secp256k1");
const path = require("path");

// Helper function to extract the key from the PEM format
function extractKeyFromPem(pem) {
  const keyLines = pem.split("\n");
  const key = keyLines
    .filter(
      (line) => line.trim() && !line.includes("BEGIN") && !line.includes("END")
    )
    .join("");
  return key;
}

const privateKeyPem = fs.readFileSync(
  path.resolve(__dirname, "../keys/slicPrivateKey.pem"),
  "utf-8"
);
const privateKey = extractKeyFromPem(privateKeyPem);
const keyPair = ec.keyFromPrivate(privateKey, "hex");

// Helper function to create TLV encoded string
function toTLV(tag, value) {
  const tagBuffer = Buffer.from([tag]); // Single byte tag
  const valueBuffer = Buffer.from(value, "utf-8"); // Value as buffer
  const lengthBuffer = Buffer.from([valueBuffer.length]); // Single byte length
  return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]); // Combine tag, length, value
}

// Generate a UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

exports.generateZatcaQrCode = [
  // Express Validator schema for validation

  checkSchema({
    invoiceDate: {
      isISO8601: {
        errorMessage: "Invoice date must be a valid ISO 8601 date",
      },
    },
    totalWithVat: {
      isFloat: {
        options: { min: 0 }, // Allow zero and positive numbers
        errorMessage: "Total with VAT must be a non-negative number",
      },
    },
    vatTotal: {
      isFloat: {
        options: { min: 0 }, // Allow zero and positive numbers
        errorMessage: "VAT total must be a non-negative number",
      },
    },
  }),
  async (req, res) => {
    // Validate incoming request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { invoiceDate, totalWithVat, vatTotal } = req.body;

      // Ensure that vatTotal is converted to an integer without decimals
      const vatTotalInteger = Math.round(vatTotal);
      const sellerName = 'Saudi Leather Industries Company';
      const vatRegistrationNumber = '300456416500003';

      // Generate the UUID for the invoice
      const invoiceUUID = generateUUID();

      // 1. Hash the invoice data (SHA-256)
      const invoiceString = `${sellerName}|${vatRegistrationNumber}|${invoiceDate}|${totalWithVat}|${vatTotalInteger}|${invoiceUUID}`;
      const invoiceHash = crypto
        .createHash("sha256")
        .update(invoiceString)
        .digest("hex");

      // 2. Sign the hash using ECDSA
      const signature = keyPair.sign(invoiceHash);
      const signatureDER = signature.toDER("hex"); // Convert to DER format (Hex encoded)

      // 3. Get the public key in uncompressed format
      const publicKey = keyPair.getPublic("hex");

      // 4. Create TLV data
      const tlvData = Buffer.concat([
        toTLV(1, sellerName),
        toTLV(2, vatRegistrationNumber),
        toTLV(3, invoiceDate),
        toTLV(4, totalWithVat.toFixed(2)),
        toTLV(5, vatTotalInteger.toString()), // Ensure vatTotal has no decimal places
        toTLV(6, invoiceHash), // Tag 6: Invoice Hash
        toTLV(7, signatureDER), // Tag 7: ECDSA Signature
        toTLV(8, publicKey), // Tag 8: ECDSA Public Key
      ]);

      // 5. Encode TLV data to Base64
      const base64QRCode = Base64.encode(tlvData);

      // Return the encoded string and the invoiceUUID to the frontend
      return res.json({ qrCodeData: base64QRCode, invoiceUUID: invoiceUUID });
    } catch (error) {
      console.error("Error generating ZATCA QR code:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
];
