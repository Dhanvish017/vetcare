const express = require("express");
const router = express.Router();
const sendWhatsapp = require("../utils/whatsapp");

router.post("/send", async (req, res) => {
  try {
    const { phone, text } = req.body;

    const result = await sendWhatsapp(phone, text);

    res.json({ success: true, message: "Message sent", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;


