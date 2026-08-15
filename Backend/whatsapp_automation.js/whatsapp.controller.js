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
// Meta redirects the clinic's browser here — not a JSON API caller —
// so on success/failure we bounce back to the frontend instead of
// rendering raw JSON in the browser.
// ---------------------
const callback = async (req, res) => {
  try {
    const result = await whatsappService.callback(req);
    if (result.redirectUrl) return res.redirect(result.redirectUrl);
    res.json(result);
  } catch (err) {
    console.error("WHATSAPP CALLBACK ERROR:", err.message);
    const fallbackUrl = whatsappService.buildFrontendRedirect("error", err.message);
    if (fallbackUrl) return res.redirect(fallbackUrl);
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

// ---------------------
// GET /api/whatsapp/webhook
// Meta's one-time subscription verification handshake
// ---------------------
const verifyWebhook = (req, res) => {
  try {
    const challenge = whatsappService.verifyWebhookChallenge(req.query);
    if (challenge !== null) {
      return res.status(200).send(challenge);
    }
    res.sendStatus(403);
  } catch (err) {
    console.error("WHATSAPP WEBHOOK VERIFY ERROR:", err.message);
    res.sendStatus(403);
  }
};

// ---------------------
// POST /api/whatsapp/webhook
// Meta delivery/status events (sent, delivered, read, failed)
// ---------------------
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    if (!whatsappService.verifySignature(req.rawBody, signature)) {
      console.error("WHATSAPP WEBHOOK SIGNATURE INVALID");
      return res.sendStatus(403);
    }

    if (!whatsappService.isValidWebhookPayload(req.body)) {
      console.error("WHATSAPP WEBHOOK PAYLOAD MALFORMED");
      return res.sendStatus(200); // ack anyway — Meta expects a fast 200 regardless
    }

    await whatsappService.processWebhookEvent(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("WHATSAPP WEBHOOK ERROR:", err.message);
    // Still acknowledge receipt so Meta doesn't disable the webhook after retries
    res.sendStatus(200);
  }
};

module.exports = { getStatus, connect, callback, disconnect, verifyWebhook, handleWebhook };
