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

module.exports = router;
