const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const whatsappController = require("./whatsapp.controller");

// ---------------------
// GET /api/whatsapp/status
// ---------------------
router.get("/status", protect, whatsappController.getStatus);

// ---------------------
// GET /api/whatsapp/connect
// ---------------------
router.get("/connect", protect, whatsappController.connect);

// ---------------------
// GET /api/whatsapp/callback
// ---------------------
router.get("/callback", whatsappController.callback);

// ---------------------
// POST /api/whatsapp/disconnect
// ---------------------
router.post("/disconnect", protect, whatsappController.disconnect);

// ---------------------
// GET /api/whatsapp/webhook
// POST /api/whatsapp/webhook
// Called by Meta, not the frontend — no JWT available, so no `protect`
// ---------------------
router.get("/webhook", whatsappController.verifyWebhook);
router.post("/webhook", whatsappController.receiveWebhook);

module.exports = router;
