const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { check, validationResult } = require("express-validator");

// Variables to store the client and QR code data
let client = null;
let clientInitialized = false;
let currentQRCodeDataURL = null;
let isClientReady = false;
let isIntentionalLogout = false;
let initializationInProgress = false;
let reconnectAttempts = 0;
let sessionCorruptionDetected = false;
let qrRetryCount = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const MAX_QR_RETRIES = 2; // Reduced from 3 to 2 for faster detection

// Function to forcefully remove directories with multiple fallback methods
function forceRemoveDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return true;
  }

  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`Successfully removed directory: ${dirPath}`);
    return true;
  } catch (error) {
    console.warn(`Method 1 failed for ${dirPath}:`, error.message);
    
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.lstatSync(fullPath);
        
        if (stat.isDirectory()) {
          forceRemoveDirectory(fullPath);
        } else {
          try {
            fs.unlinkSync(fullPath);
          } catch (fileError) {
            try {
              fs.chmodSync(fullPath, 0o777);
              fs.unlinkSync(fullPath);
            } catch (permError) {
              console.warn(`Could not remove file: ${fullPath}`, permError.message);
            }
          }
        }
      }
      fs.rmdirSync(dirPath);
      console.log(`Successfully removed directory using method 2: ${dirPath}`);
      return true;
    } catch (error2) {
      console.error(`All methods failed to remove ${dirPath}:`, error2.message);
      return false;
    }
  }
}

// Function to clean up all WhatsApp related data
function cleanupWhatsAppData() {
  const authPath = path.join(__dirname, "../.wwebjs_auth");
  const cachePath = path.join(__dirname, "../.wwebjs_cache");
  
  console.log("Cleaning up WhatsApp data...");
  
  if (fs.existsSync(authPath)) {
    forceRemoveDirectory(authPath);
  }
  
  if (fs.existsSync(cachePath)) {
    forceRemoveDirectory(cachePath);
  }
}

// Function to destroy existing client properly
async function destroyClient(skipPageClose = false) {
  console.log("Destroying client...");
  if (client) {
    try {
      client.removeAllListeners();
      
      if (!skipPageClose) {
        if (client.pupPage) {
          try {
            if (!client.pupPage.isClosed()) {
              await client.pupPage.close().catch(e => console.warn("Page close error:", e.message));
            }
          } catch (e) {
            console.warn("Error checking/closing page:", e.message);
          }
        }
        
        if (client.pupBrowser) {
          try {
            await client.pupBrowser.close().catch(e => console.warn("Browser close error:", e.message));
          } catch (e) {
            console.warn("Error closing browser:", e.message);
          }
        }
      }
      
      await client.destroy().catch(e => console.warn("Client destroy error:", e.message));
      console.log("Client destroyed successfully");
    } catch (error) {
      console.warn("Error destroying client:", error.message);
    }
  }
  client = null;
  clientInitialized = false;
  isClientReady = false;
  currentQRCodeDataURL = null;
  initializationInProgress = false;
}

// Check if client is in a healthy state
function isClientHealthy() {
  try {
    if (!client || !isClientReady) {
      return false;
    }
    
    if (!client.info || !client.info.wid) {
      return false;
    }
    
    if (!client.pupPage || client.pupPage.isClosed()) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn("Error checking client health:", error.message);
    return false;
  }
}

// Check if session exists before auto-initializing
function hasExistingSession() {
  const authPath = path.join(__dirname, "../.wwebjs_auth/session-client-one");
  return fs.existsSync(authPath);
}

// Function to initialize the client and wait for QR code
async function initializeClient(forceNew = false) {
  if (initializationInProgress && !forceNew) {
    console.log("Initialization already in progress, waiting...");
    let waitTime = 0;
    while (initializationInProgress && waitTime < 15000) { // Reduced from 30s to 15s
      await new Promise(resolve => setTimeout(resolve, 500));
      waitTime += 500;
    }
    return { status: isClientReady ? 'ready' : 'initializing' };
  }

  if (!forceNew && isClientHealthy()) {
    console.log("Client is already healthy and ready");
    reconnectAttempts = 0;
    qrRetryCount = 0;
    sessionCorruptionDetected = false;
    return { status: 'ready' };
  }

  initializationInProgress = true;

  try {
    if (forceNew) {
      console.log("Force new client requested, cleaning up...");
      await destroyClient(false);
      await new Promise(r => setTimeout(r, 1000)); // Reduced from 2s to 1s
      cleanupWhatsAppData();
      await new Promise(r => setTimeout(r, 500)); // Reduced from 1s to 0.5s
      reconnectAttempts = 0;
      qrRetryCount = 0;
      sessionCorruptionDetected = false;
    }

    if (client && !isClientHealthy()) {
      console.log("Client exists but is not healthy, destroying...");
      await destroyClient(true);
      await new Promise(r => setTimeout(r, 500)); // Reduced from 1s to 0.5s
    }

    if (client && clientInitialized && isClientReady && isClientHealthy()) {
      console.log("Client already initialized and ready");
      initializationInProgress = false;
      reconnectAttempts = 0;
      qrRetryCount = 0;
      return { status: 'ready' };
    }

    return new Promise((resolve, reject) => {
      clientInitialized = true;
      isIntentionalLogout = false;
      console.log("Starting new client initialization...");

      const sessionExists = hasExistingSession();
      console.log(`Initializing client... Existing session found: ${sessionExists}`);

      client = new Client({
        authStrategy: new LocalAuth({
          clientId: "client-one",
          dataPath: path.join(__dirname, "../.wwebjs_auth"),
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ]
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        qrMaxRetries: sessionExists ? 0 : 5,
        sendSeen: false
      });

      let resolved = false;

      client.on("qr", async (qr) => {
        try {
          currentQRCodeDataURL = await QRCode.toDataURL(qr);
          console.log("QR code received, scan with your phone");

          if (sessionExists) {
            qrRetryCount++;
            console.warn(`QR shown despite existing session (attempt ${qrRetryCount}/${MAX_QR_RETRIES})`);
            
            // Immediately mark as corrupted after 2 attempts
            if (qrRetryCount >= MAX_QR_RETRIES) {
              console.error("Session is corrupted - marking for cleanup");
              sessionCorruptionDetected = true;
              
              if (!resolved) {
                resolved = true;
                initializationInProgress = false;
                resolve({ status: 'auth_failed', needsQR: true, sessionCorrupted: true });
                return;
              }
            }
          }

          if (!resolved && (!sessionExists || qrRetryCount >= 1)) {
            resolved = true;
            initializationInProgress = false;
            resolve({ status: 'qr', qrCode: currentQRCodeDataURL, sessionCorrupted: sessionExists });
          }
        } catch (err) {
          console.error("Error generating QR code:", err);
          if (!resolved) {
            resolved = true;
            initializationInProgress = false;
            reject(err);
          }
        }
      });

      client.on("ready", () => {
        console.log("WhatsApp client is ready!");
        isClientReady = true;
        currentQRCodeDataURL = null;
        reconnectAttempts = 0;
        qrRetryCount = 0;
        sessionCorruptionDetected = false;
        
        if (!resolved) {
          resolved = true;
          initializationInProgress = false;
          resolve({ status: 'ready' });
        }
      });

      client.on("authenticated", () => {
        console.log("Authenticated successfully!");
        isClientReady = false;
      });

      client.on("auth_failure", async (msg) => {
        console.error("Authentication failure:", msg);
        sessionCorruptionDetected = true;
        await destroyClient(true);
        cleanupWhatsAppData();

        if (!resolved) {
          resolved = true;
          initializationInProgress = false;
          resolve({ status: 'auth_failed', needsQR: true, sessionCorrupted: true });
        }
      });

      client.on("disconnected", async (reason) => {
        console.log(`WhatsApp client disconnected. Reason: ${reason}, Intentional: ${isIntentionalLogout}`);
        isClientReady = false;
        
        if (isIntentionalLogout) {
          console.log("Intentional logout - destroying client and clearing data");
          await destroyClient(true);
          cleanupWhatsAppData();
          isIntentionalLogout = false;
          reconnectAttempts = 0;
          return;
        }
        
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log(`Max reconnect attempts reached. Stopping reconnection.`);
          await destroyClient(true);
          reconnectAttempts = 0;
          return;
        }
        
        reconnectAttempts++;
        console.log(`Unexpected disconnection (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        await destroyClient(true);
      });

      client.on("change_state", (state) => {
        console.log("Client state changed:", state);
      });

      client.on("error", (error) => {
        console.error("Client error:", error);

        if (error.message && (
          error.message.includes('ERR_NAME_NOT_RESOLVED') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED') ||
          error.message.includes('net::ERR')
        )) {
          console.error("Network error detected");
          if (!resolved) {
            resolved = true;
            initializationInProgress = false;
            reject(new Error("Network error: Unable to reach WhatsApp Web."));
          }
        }
      });

      // Reduced timeout for faster failure detection
      const timeout = sessionExists ? 20000 : 30000; // Reduced from 120s/60s to 20s/30s
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          initializationInProgress = false;

          if (sessionExists) {
            console.log("Session restoration timed out - session corrupted");
            sessionCorruptionDetected = true;
            resolve({ status: 'auth_failed', needsQR: true, sessionCorrupted: true });
          } else {
            reject(new Error("Client initialization timeout"));
          }
        }
      }, timeout);

      try {
        client.initialize();
      } catch (error) {
        console.error("Error initializing client:", error);
        initializationInProgress = false;
        reject(error);
      }
    });
  } catch (error) {
    console.error("Error in initializeClient:", error);
    initializationInProgress = false;
    throw error;
  }
}

// Auto-initialize client on server start with faster timeout
setTimeout(async () => {
  const sessionExists = hasExistingSession();
  console.log(`Auto-initializing client... Session exists: ${sessionExists}`);

  if (sessionExists) {
    console.log("Found existing session, auto-initializing...");
    try {
      const result = await initializeClient(false);
      if (result.status === 'ready') {
        console.log("✅ Session restored successfully!");
      } else if (result.status === 'auth_failed' || result.sessionCorrupted) {
        console.warn("⚠️ Session corrupted - will need QR scan");
        sessionCorruptionDetected = true;
      }
    } catch (error) {
      console.error("Auto-initialization failed:", error.message);
      sessionCorruptionDetected = true;
    }
  } else {
    console.log("No existing session, waiting for user");
  }
}, 3000); // Reduced from 5s to 3s

// Endpoint to check session status
exports.checkSession = async (req, res) => {
  try {
    if (isClientHealthy()) {
      qrRetryCount = 0;
      sessionCorruptionDetected = false;
      return res.json({ status: "success", message: "Session is active" });
    }

    const forceNew = req.query.forceNew === 'true';

    if (sessionCorruptionDetected || forceNew) {
      console.log("Session corrupted - force cleanup and generate fresh QR");
      await destroyClient(true);
      cleanupWhatsAppData();
      await new Promise(r => setTimeout(r, 1000));
      sessionCorruptionDetected = false;
      qrRetryCount = 0;
    }

    try {
      const result = await initializeClient(forceNew || sessionCorruptionDetected);

      if (result.status === 'ready') {
        qrRetryCount = 0;
        sessionCorruptionDetected = false;
        res.json({ status: "success", message: "Session is active" });
      } else if (result.status === 'qr') {
        res.json({
          status: "qr_required",
          message: result.sessionCorrupted ? "Session expired. Please scan QR code." : "Please scan the QR code.",
          qrCode: result.qrCode,
          sessionCorrupted: result.sessionCorrupted || false
        });
      } else if (result.status === 'auth_failed') {
        sessionCorruptionDetected = true;
        await destroyClient(true);
        cleanupWhatsAppData();
        await new Promise(r => setTimeout(r, 1000));
        
        const freshResult = await initializeClient(true);
        if (freshResult.status === 'qr') {
          res.json({
            status: "qr_required",
            message: "Session expired. Please scan QR code to reconnect.",
            qrCode: freshResult.qrCode,
            sessionCorrupted: true,
            autoLoggedOut: true
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to generate QR code. Please try again.",
            needsRetry: true
          });
        }
      } else {
        res.json({
          status: "initializing",
          message: "Initializing..."
        });
      }
    } catch (err) {
      console.error("Error during initialization:", err);
      
      if (err.message && err.message.includes('Network error')) {
        res.status(500).json({ 
          status: "error",
          error: "Network error. Please check your connection.",
          needsRetry: true
        });
      } else {
        sessionCorruptionDetected = true;
        res.status(500).json({ 
          status: "error",
          error: "Failed to initialize. Please logout and reconnect.",
          sessionCorrupted: true
        });
      }
    }
  } catch (error) {
    console.error("Error in checkSession:", error);
    res.status(500).json({ 
      status: "error",
      error: "Internal error. Please try again.",
      needsRetry: true
    });
  }
};

// Send WhatsApp message
exports.sendWhatsAppMessage = [
  [
    check("phoneNumber").isMobilePhone().withMessage("Invalid phone number"),
    check("messageText").isLength({ min: 1 }).withMessage("Message cannot be empty"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, messageText } = req.body;
    const attachmentPath = req.file ? req.file.path : null;

    try {
      if (!isClientHealthy()) {
        const result = await initializeClient(false);
        if (result.status !== 'ready') {
          return res.status(400).json({ error: "WhatsApp not connected." });
        }
      }

      const formattedPhoneNumber = `${phoneNumber.replace(/\D/g, "")}@c.us`;

      if (attachmentPath) {
        const media = MessageMedia.fromFilePath(attachmentPath);
        await client.sendMessage(formattedPhoneNumber, media, { caption: messageText });
        try { fs.unlinkSync(attachmentPath); } catch (e) {}
      } else {
        await client.sendMessage(formattedPhoneNumber, messageText);
      }

      const ratingLink = "https://docs.google.com/forms/d/e/1FAIpQLSceYlSsIGZ9j6YjB0pFBnn7xcWBSRP7UOmYalyPPrWstvVvQA/viewform";
      const ratingMessage = `We value your feedback! Please rate your purchase: ${ratingLink}`;
      await client.sendMessage(formattedPhoneNumber, ratingMessage);

      res.json({ message: "Messages sent successfully!" });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send messages" });
      if (attachmentPath) {
        try { fs.unlinkSync(attachmentPath); } catch (e) {}
      }
    }
  },
];

// Logout WhatsApp
exports.logoutWhatsApp = async (req, res) => {
  try {
    console.log("Logout requested");
    isIntentionalLogout = true;
    reconnectAttempts = 0;
    qrRetryCount = 0;
    sessionCorruptionDetected = false;
    
    if (client && client.info && client.info.wid) {
      try {
        await client.logout();
      } catch (e) {
        console.warn("Logout error:", e.message);
      }
    }

    await new Promise(r => setTimeout(r, 2000));
    
    if (client) {
      await destroyClient(true);
      cleanupWhatsAppData();
    }

    res.json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    isIntentionalLogout = true;
    await destroyClient(true);
    cleanupWhatsAppData();
    res.json({ status: "success", message: "Logged out successfully" });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    if (sessionCorruptionDetected) {
      return res.status(400).json({
        status: "error",
        message: "Session corrupted. Please logout and reconnect.",
        needsConnection: true,
        sessionCorrupted: true
      });
    }

    if (!isClientHealthy()) {
      if (client && clientInitialized && !isClientReady) {
        // Wait only 5 seconds instead of 10
        let waitTime = 0;
        while (!isClientReady && waitTime < 5000) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitTime += 500;
          if (isClientReady) break;
        }

        if (!isClientReady) {
          return res.status(400).json({
            status: "error",
            message: "Still initializing. Please wait...",
            needsConnection: true,
            isInitializing: true
          });
        }
      } else {
        return res.status(400).json({
          status: "error",
          message: "Not connected. Please connect first.",
          needsConnection: true
        });
      }
    }

    if (!isClientHealthy()) {
      return res.status(400).json({
        status: "error",
        message: "Not ready. Please connect first.",
        needsConnection: true
      });
    }

    const userId = client.info.wid._serialized;
    let profilePicUrl;
    try {
      profilePicUrl = await client.getProfilePicUrl(userId);
    } catch (e) {
      profilePicUrl = null;
    }
    
    const userName = client.info.pushname;
    const userNumber = client.info.me.user;

    qrRetryCount = 0;
    sessionCorruptionDetected = false;

    res.json({
      status: "success",
      data: { name: userName, number: userNumber, profilePicUrl }
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    
    if (error.message && (
      error.message.includes("context was destroyed") ||
      error.message.includes("Target closed") ||
      error.message.includes("Protocol error")
    )) {
      isClientReady = false;
      sessionCorruptionDetected = true;
      
      res.status(500).json({ 
        status: "error",
        error: "Session expired. Please logout and reconnect.",
        needsConnection: true,
        sessionCorrupted: true
      });
    } else {
      res.status(500).json({ 
        status: "error",
        error: "Failed to fetch profile.",
        needsConnection: true
      });
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT - cleaning up...');
  isIntentionalLogout = true;
  await destroyClient(false);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM - cleaning up...');
  isIntentionalLogout = true;
  await destroyClient(false);
  process.exit(0);
});