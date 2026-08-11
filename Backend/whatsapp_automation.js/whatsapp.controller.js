const whatsappService = require("./whatsapp.service");

// ---------------------
// GET /api/whatsapp/status
// ---------------------
const getStatus = async (req, res) => {
  try {
    const status = await whatsappService.getStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error("WHATSAPP STATUS ERROR:", err.message);
    res.status(500).json({ message: "Failed to get WhatsApp status" });
  }
};

// ---------------------
// GET /api/whatsapp/connect
// ---------------------
const connect = async (req, res) => {
  try {
    const result = await whatsappService.connect(req.user.id);
    res.json(result);
  } catch (err) {
    console.error("WHATSAPP CONNECT ERROR:", err.message);
    res.status(500).json({ message: "Failed to connect WhatsApp" });
  }
};

// ---------------------
// GET /api/whatsapp/callback
// ---------------------
const callback = async (req, res) => {
  try {
    const result = await whatsappService.callback(req);
    res.json(result);
  } catch (err) {
    console.error("WHATSAPP CALLBACK ERROR:", err.message);
    res.status(500).json({ message: "Failed to process WhatsApp callback" });
  }
};

// ---------------------
// POST /api/whatsapp/disconnect
// ---------------------
const disconnect = async (req, res) => {
  try {
    const result = await whatsappService.disconnect(req.user.id);
    res.json(result);
  } catch (err) {
    console.error("WHATSAPP DISCONNECT ERROR:", err.message);
    res.status(500).json({ message: "Failed to disconnect WhatsApp" });
  }
};

module.exports = { getStatus, connect, callback, disconnect };
