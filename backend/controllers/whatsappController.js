const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const os = require("os");
const QRCode = require("qrcode");
const { check, validationResult } = require("express-validator");
const pino = require("pino");

// Session storage path
const AUTH_FOLDER = path.join(__dirname, "../.baileys_auth");

// Variables to store the socket and state
let sock = null;
let isConnected = false;
let currentQRCodeDataURL = null;
let isIntentionalLogout = false;
let initializationInProgress = false;
let userInfo = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Create silent logger for Baileys
const logger = pino({ level: "silent" });

// Ensure auth folder exists
function ensureAuthFolder() {
  if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
  }
}

// Clean up auth folder
function cleanupAuthFolder() {
  if (fs.existsSync(AUTH_FOLDER)) {
    try {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
      console.log("Auth folder cleaned up successfully");
    } catch (error) {
      console.error("Error cleaning auth folder:", error.message);
    }
  }
}

// Check if session exists
function hasExistingSession() {
  const credsPath = path.join(AUTH_FOLDER, "creds.json");
  return fs.existsSync(credsPath);
}

// Quick disconnect without logout call
async function quickDisconnect() {
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end();
    } catch (error) {
      console.warn("Error in quick disconnect:", error.message);
    }
    sock = null;
  }
  isConnected = false;
  currentQRCodeDataURL = null;
  userInfo = null;
  initializationInProgress = false;
}

// Initialize WhatsApp connection
async function initializeConnection(forceNew = false) {
  // If already connecting, wait briefly
  if (initializationInProgress && !forceNew) {
    console.log("Initialization already in progress...");
    let waitTime = 0;
    while (initializationInProgress && waitTime < 10000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      waitTime += 500;
    }
    return { status: isConnected ? "ready" : "initializing" };
  }

  // Already connected
  if (!forceNew && isConnected && sock) {
    console.log("Already connected");
    return { status: "ready" };
  }

  initializationInProgress = true;

  try {
    // Force new - clean everything first
    if (forceNew) {
      console.log("Force new connection - cleaning up...");
      await quickDisconnect();
      cleanupAuthFolder();
      await new Promise((r) => setTimeout(r, 500));
      reconnectAttempts = 0;
    } else if (sock) {
      await quickDisconnect();
    }

    ensureAuthFolder();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`Creating WhatsApp socket... (Version: ${version.join(".")}, isLatest: ${isLatest})`);

    return new Promise((resolve) => {
      let resolved = false;
      let qrCount = 0;

      sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        getMessage: async (key) => {
          return { conversation: "" };
        },
      });

      // Handle connection updates
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // QR code received
        if (qr) {
          qrCount++;
          console.log(`QR code generated (attempt ${qrCount})`);

          try {
            currentQRCodeDataURL = await QRCode.toDataURL(qr);

            if (!resolved) {
              resolved = true;
              initializationInProgress = false;
              resolve({ status: "qr", qrCode: currentQRCodeDataURL });
            }
          } catch (err) {
            console.error("Error generating QR code:", err);
          }
        }

        if (connection === "close") {
          const statusCode =
            lastDisconnect?.error?.output?.statusCode ||
            lastDisconnect?.error?.output?.payload?.statusCode;
          const reason = DisconnectReason[statusCode] || statusCode;

          console.log(`Connection closed. Status: ${statusCode} (${reason})`);

          isConnected = false;
          currentQRCodeDataURL = null;

          if (isIntentionalLogout) {
            console.log("Intentional logout - cleaning up");
            cleanupAuthFolder();
            isIntentionalLogout = false;
            reconnectAttempts = 0;
            if (!resolved) {
              resolved = true;
              initializationInProgress = false;
              resolve({ status: "logged_out" });
            }
            return;
          }

          // Handle different disconnect reasons
          if (statusCode === DisconnectReason.loggedOut) {
            console.log("Logged out from WhatsApp - cleaning session");
            cleanupAuthFolder();
            reconnectAttempts = 0;
            if (!resolved) {
              resolved = true;
              initializationInProgress = false;
              resolve({ status: "logged_out", needsQR: true });
            }
          } else if (statusCode === DisconnectReason.restartRequired) {
            // Restart required - try to reconnect with existing session first
            console.log("Restart required - attempting reconnection...");
            reconnectAttempts++;

            if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
              await quickDisconnect();
              setTimeout(async () => {
                try {
                  initializationInProgress = false;
                  const result = await initializeConnection(false);
                  if (!resolved && result.status === "ready") {
                    resolved = true;
                    resolve(result);
                  }
                } catch (e) {
                  console.error("Reconnect failed:", e);
                  if (!resolved) {
                    resolved = true;
                    initializationInProgress = false;
                    resolve({ status: "connection_failed", needsQR: true });
                  }
                }
              }, 3000);
            } else {
              console.log("Max reconnect attempts reached - cleaning session");
              await quickDisconnect();
              cleanupAuthFolder();
              reconnectAttempts = 0;
              if (!resolved) {
                resolved = true;
                initializationInProgress = false;
                resolve({ status: "logged_out", needsQR: true });
              }
            }
          } else if (statusCode === DisconnectReason.connectionReplaced) {
            console.log("Connection replaced by another session");
            if (!resolved) {
              resolved = true;
              initializationInProgress = false;
              resolve({ status: "replaced" });
            }
          } else if (
            statusCode === DisconnectReason.connectionClosed ||
            statusCode === DisconnectReason.connectionLost ||
            statusCode === DisconnectReason.timedOut
          ) {
            // Temporary disconnection - try to reconnect
            reconnectAttempts++;
            if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS && !resolved) {
              console.log(`Reconnecting (attempt ${reconnectAttempts})...`);
              await quickDisconnect();
              setTimeout(() => {
                initializeConnection(false).catch(console.error);
              }, 3000);
            } else if (!resolved) {
              resolved = true;
              initializationInProgress = false;
              resolve({ status: "disconnected", needsQR: true });
            }
          } else {
            // Unknown error
            if (!resolved) {
              resolved = true;
              initializationInProgress = false;
              resolve({ status: "error", needsQR: true });
            }
          }
        }

        if (connection === "open") {
          console.log("WhatsApp connected successfully!");
          isConnected = true;
          currentQRCodeDataURL = null;
          reconnectAttempts = 0;

          if (sock.user) {
            const phoneNumber = sock.user.id.split(":")[0].split("@")[0];

            // Try multiple fields for the name
            let profileName = sock.user.verifiedName ||
              sock.user.notify ||
              sock.user.name ||
              "WhatsApp User";

            userInfo = {
              id: sock.user.id,
              name: profileName,
              number: phoneNumber,
            };
            console.log(`Connected as: ${userInfo.name} (${userInfo.number})`);

            // Try to fetch updated profile info after a short delay
            setTimeout(async () => {
              try {
                if (sock.user && (sock.user.verifiedName || sock.user.notify)) {
                  const updatedName = sock.user.verifiedName || sock.user.notify || sock.user.name;
                  if (updatedName && updatedName !== "WhatsApp User") {
                    userInfo.name = updatedName;
                    console.log(`Profile name updated to: ${userInfo.name}`);
                  }
                }
              } catch (e) {
                // Ignore errors
              }
            }, 2000);
          }

          if (!resolved) {
            resolved = true;
            initializationInProgress = false;
            resolve({ status: "ready" });
          }
        }
      });

      // Save credentials on update
      sock.ev.on("creds.update", saveCreds);

      // Timeout for QR display
      setTimeout(() => {
        if (!resolved && !isConnected) {
          resolved = true;
          initializationInProgress = false;
          console.log("Initialization timeout");
          resolve({ status: "timeout", needsQR: true });
        }
      }, 60000);
    });
  } catch (error) {
    console.error("Error initializing connection:", error);
    initializationInProgress = false;
    throw error;
  }
}

// Auto-initialize on server start if session exists
setTimeout(async () => {
  if (hasExistingSession()) {
    console.log("Found existing session, auto-initializing...");
    try {
      const result = await initializeConnection(false);
      if (result.status === "ready") {
        console.log("✅ Session restored successfully!");
      } else {
        console.log("Session requires action:", result.status);
      }
    } catch (error) {
      console.error("Auto-initialization failed:", error.message);
    }
  } else {
    console.log("No existing WhatsApp session found");
  }
}, 3000);

// Check session status endpoint
exports.checkSession = async (req, res) => {
  try {
    // Quick check if already connected
    if (isConnected && sock) {
      return res.json({ status: "success", message: "Session is active" });
    }

    const forceNew = req.query.forceNew === "true";

    // Force new requested - clean and generate fresh QR
    if (forceNew) {
      console.log("Force new session requested");
      await quickDisconnect();
      cleanupAuthFolder();
      await new Promise((r) => setTimeout(r, 500));
    }

    try {
      const result = await initializeConnection(forceNew);

      if (result.status === "ready") {
        res.json({ status: "success", message: "Session is active" });
      } else if (result.status === "qr") {
        res.json({
          status: "qr_required",
          message: "Please scan the QR code.",
          qrCode: result.qrCode,
        });
      } else if (result.needsQR) {
        // Need fresh QR
        console.log("Session invalid, generating fresh QR...");
        await quickDisconnect();
        cleanupAuthFolder();
        await new Promise((r) => setTimeout(r, 500));

        const freshResult = await initializeConnection(true);
        if (freshResult.status === "qr") {
          res.json({
            status: "qr_required",
            message: "Session expired. Please scan QR code.",
            qrCode: freshResult.qrCode,
            sessionExpired: true,
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to generate QR code. Please try again.",
            needsRetry: true,
          });
        }
      } else {
        res.json({
          status: "initializing",
          message: "Initializing...",
        });
      }
    } catch (err) {
      console.error("Error during initialization:", err);
      await quickDisconnect();
      res.status(500).json({
        status: "error",
        error: "Failed to initialize. Please try again.",
        needsRetry: true,
      });
    }
  } catch (error) {
    console.error("Error in checkSession:", error);
    res.status(500).json({
      status: "error",
      error: "Internal error. Please try again.",
      needsRetry: true,
    });
  }
};

// Send WhatsApp message
exports.sendWhatsAppMessage = [
  [
    check("phoneNumber").isMobilePhone().withMessage("Invalid phone number"),
    check("messageText")
      .isLength({ min: 1 })
      .withMessage("Message cannot be empty"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, messageText } = req.body;
    const attachmentPath = req.file ? req.file.path : null;

    try {
      if (!isConnected || !sock) {
        return res.status(400).json({ error: "WhatsApp not connected." });
      }

      // Format phone number for WhatsApp
      const cleanNumber = phoneNumber.replace(/\D/g, "");
      const jid = `${cleanNumber}@s.whatsapp.net`;

      // Send attachment if present
      if (attachmentPath) {
        const fileBuffer = fs.readFileSync(attachmentPath);
        const mimeType = getMimeType(attachmentPath);
        const fileName = path.basename(attachmentPath);

        await sock.sendMessage(jid, {
          document: fileBuffer,
          mimetype: mimeType,
          fileName: fileName,
          caption: messageText,
        });

        // Clean up uploaded file
        try {
          fs.unlinkSync(attachmentPath);
        } catch (e) { }
      } else {
        await sock.sendMessage(jid, { text: messageText });
      }

      // Send rating link
      const ratingLink =
        "https://docs.google.com/forms/d/e/1FAIpQLSceYlSsIGZ9j6YjB0pFBnn7xcWBSRP7UOmYalyPPrWstvVvQA/viewform";
      const ratingMessage = `We value your feedback! Please rate your purchase: ${ratingLink}`;
      await sock.sendMessage(jid, { text: ratingMessage });

      res.json({ message: "Messages sent successfully!" });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send messages" });
      if (attachmentPath) {
        try {
          fs.unlinkSync(attachmentPath);
        } catch (e) { }
      }
    }
  },
];

// Helper function to get MIME type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// Logout WhatsApp
exports.logoutWhatsApp = async (req, res) => {
  try {
    console.log("Logout requested");
    isIntentionalLogout = true;

    if (sock) {
      try {
        await sock.logout();
      } catch (e) {
        console.warn("Logout call error:", e.message);
      }
    }

    await quickDisconnect();
    cleanupAuthFolder();

    res.json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    await quickDisconnect();
    cleanupAuthFolder();
    res.json({ status: "success", message: "Logged out successfully" });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    if (!isConnected || !sock) {
      return res.status(400).json({
        status: "error",
        message: "Not connected. Please connect first.",
        needsConnection: true,
      });
    }

    // Get profile picture URL
    let profilePicUrl = null;
    let actualName = userInfo?.name || "WhatsApp User";

    try {
      if (userInfo && userInfo.id) {
        profilePicUrl = await sock.profilePictureUrl(userInfo.id, "image");
      }
    } catch (e) {
      profilePicUrl = null;
    }

    // Try to fetch actual profile name from WhatsApp
    try {
      if (userInfo && userInfo.id) {
        const status = await sock.fetchStatus(userInfo.id);
        if (status && status.status) {
          // Sometimes the name is in the status
          actualName = userInfo.name || status.status || "WhatsApp User";
        }
      }
    } catch (e) {
      // Ignore if can't fetch status
    }

    // Update userInfo if we got a better name
    if (actualName !== "WhatsApp User" && actualName !== "Unknown") {
      userInfo.name = actualName;
    }

    res.json({
      status: "success",
      data: {
        name: userInfo?.name || "WhatsApp User",
        number: userInfo?.number || "",
        profilePicUrl: profilePicUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to fetch profile.",
      needsConnection: true,
    });
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("SIGINT - cleaning up WhatsApp connection...");
  isIntentionalLogout = true;
  await quickDisconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM - cleaning up WhatsApp connection...");
  isIntentionalLogout = true;
  await quickDisconnect();
  process.exit(0);
});
