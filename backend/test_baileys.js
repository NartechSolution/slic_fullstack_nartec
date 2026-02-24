const { fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

(async () => {
    try {
        const result = await fetchLatestBaileysVersion();
        console.log("Latest Baileys version:", result);
    } catch (e) {
        console.log("Error", e);
    }
})();
