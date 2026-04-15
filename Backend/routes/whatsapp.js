const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { protect } = require("../middleware/auth");
const messageTemplates = require("../utils/messageTemplates");

// ---------------------
// SAVE SELECTED TEMPLATE
// ---------------------
router.post("/whatsapp-template", protect, async (req, res) => {
  try {
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: "Template is required" });
    }

    await pool.query(
      "UPDATE users SET whatsapp_template = $1 WHERE id = $2",
      [templateId, req.user.id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: "Failed to save template" });
  }
});


// ---------------------
// GET SELECTED TEMPLATE
// ---------------------
router.get("/whatsapp-template", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT whatsapp_template FROM users WHERE id = $1",
      [req.user.id]
    );

    const user = result.rows[0];

    res.json({ templateId: user?.whatsapp_template });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});


// ---------------------
// LIST ALL TEMPLATES
// ---------------------
router.get("/templates", protect, (req, res) => {
  try {
    const templates = Object.values(messageTemplates).map((t) => ({
      id: t.id,
      label: t.label,
      preview: t.body.slice(0, 120) + "...",
    }));

    res.json(templates);

  } catch (err) {
    res.status(500).json({ message: "Failed to load templates" });
  }
});


// ---------------------
// BUILD WHATSAPP MESSAGE
// ---------------------
router.post("/build-whatsapp-message", protect, async (req, res) => {
  try {
    const { reminder, messageType } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let template;

    if (messageType === "thankyou") {
      template = messageTemplates.THANK_YOU_SIMPLE;
    } else if (messageType === "missed") {
      template = messageTemplates.MISSED_FOLLOWUP;
    } else {
      template =
        messageTemplates[user.whatsapp_template] ||
        messageTemplates.FRIENDLY_V1;
    }

    const senderName =
      user.account_type === "clinic"
        ? user.clinic_name || ""
        : `Dr. ${user.name || ""}`;

    const activityType =
      String(reminder.type || "").toLowerCase() === "deworming"
        ? "Deworming"
        : "Vaccination";

    const petEmoji =
      reminder.species === "dog"
        ? "🐶"
        : reminder.species === "cat"
        ? "🐱"
        : "🐾";

    let message = template.body
      .replace(/{{ownerName}}/g, reminder.ownerName || "Pet Owner")
      .replace(/{{petName}}/g, reminder.petName || "your pet")
      .replace(/{{petEmoji}}/g, petEmoji)
      .replace(/{{activityType}}/g, activityType)
      .replace(/{{dueDate}}/g, reminder.dueDate || "")
      .replace(/{{contact}}/g, user.phone || "")
      .replace(/{{senderName}}/g, senderName);

    res.json({ message });

  } catch (err) {
    console.error("BUILD MESSAGE ERROR:", err);
    res.status(500).json({ message: "Failed to build message" });
  }
});

module.exports = router;