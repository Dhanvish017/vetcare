const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const { protect } = require("../middleware/auth");
const messageTemplates = require("../utils/messageTemplates");

// ---------------------
// HELPERS
// ---------------------
const pickRandom = (arr) => {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const findById = (templateId) => {
  const all = [
    ...(messageTemplates.REMINDER     || []),
    ...(messageTemplates.BIRTHDAY     || []),
    ...(messageTemplates.NEW_OWNER    || []),
    ...(messageTemplates.THANK_YOU    || []),
    ...(messageTemplates.THREE_MONTHS || []),
    ...(messageTemplates.MISSED       || []),
  ];
  return all.find((t) => t.id === templateId) || null;
};

const TYPE_TO_CATEGORY = {
  reminder:     "REMINDER",
  birthday:     "BIRTHDAY",
  new_owner:    "NEW_OWNER",
  special:      "NEW_OWNER",
  thankyou:     "THANK_YOU",
  three_months: "THREE_MONTHS",
  missed:       "MISSED",
};

// messageType → key used in whatsapp_templates JSONB
const TYPE_TO_KEY = {
  reminder:     "reminder",
  birthday:     "birthday",
  new_owner:    "new_owner",
  special:      "new_owner",
  thankyou:     "thank_you",
  three_months: "three_months",
  missed:       "missed",
};

// ---------------------
// POST /api/notify/whatsapp-template
// Save per-category selection
// ---------------------
router.post("/whatsapp-template", protect, async (req, res) => {
  try {
    const { templateId, category } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: "templateId is required" });
    }

    // Upsert into JSONB column: whatsapp_templates
    await pool.query(
      `UPDATE users
       SET whatsapp_templates = COALESCE(whatsapp_templates, '{}'::jsonb)
                                || jsonb_build_object($1::text, $2::text)
       WHERE id = $3`,
      [category || "reminder", templateId, req.user.id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("SAVE TEMPLATE ERROR:", err);
    res.status(500).json({ message: "Failed to save template" });
  }
});

// ---------------------
// GET /api/notify/whatsapp-template
// Returns { templateId: { reminder: "SIMPLE", birthday: "BIRTHDAY_WARM", ... } }
// ---------------------
router.get("/whatsapp-template", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT whatsapp_templates FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];
    res.json({ templateId: user?.whatsapp_templates || {} });

  } catch (err) {
    console.error("GET TEMPLATE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// ---------------------
// GET /api/notify/templates
// List all available templates
// ---------------------
router.get("/templates", protect, (req, res) => {
  try {
    const templates = [];
    Object.keys(messageTemplates).forEach((category) => {
      const value = messageTemplates[category];
      if (Array.isArray(value)) {
        value.forEach((t) => {
          templates.push({
            id:      t.id,
            label:   t.label,
            preview: t.body?.slice(0, 120) || "",
            category,
          });
        });
      }
    });
    res.json(templates);
  } catch (err) {
    console.error("TEMPLATE LIST ERROR:", err);
    res.status(500).json({ message: "Failed to load templates" });
  }
});

// ---------------------
// POST /api/notify/build-whatsapp-message
// Build the actual WhatsApp message using saved template preference
// ---------------------
router.post("/build-whatsapp-message", protect, async (req, res) => {
  try {
    const { reminder, messageType } = req.body;

    // Fetch user with template selections
    const result = await pool.query(
      "SELECT id, name, clinic_name, account_type, phone, whatsapp_templates FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    const savedSelections = user.whatsapp_templates || {};
    const categoryKey     = TYPE_TO_KEY[messageType]      || "reminder";
    const category        = TYPE_TO_CATEGORY[messageType] || "REMINDER";

    // Find template: use saved preference → fallback to random
    // ---------------------
// FIND TEMPLATE
// ---------------------
let template = null;

const savedId = savedSelections[categoryKey];

// Try saved template first
if (savedId) {
  template = findById(savedId);
}

// ---------------------
// FALLBACK
// ---------------------
if (!template) {

  // REMINDER → nested object
  if (category === "REMINDER") {

    const style = "SIMPLE";

    const templates =
      messageTemplates.REMINDER[style] ||
      messageTemplates.REMINDER.SIMPLE;

    template = pickRandom(templates);

  } else {

    // Other categories → normal array
    template = pickRandom(messageTemplates[category]);
  }
}

// Final safety
if (!template) {
  return res.status(404).json({
    message: "No template found",
  });
}

    // Sender name
    const senderName =
      user.account_type === "clinic"
        ? user.clinic_name || "Clinic"
        : `Dr. ${user.name || "Doctor"}`;

    // Activity type
    const raw = String(reminder?.type || reminder?.activityType || "").toLowerCase();
    const activityType =
      raw === "deworming"                          ? "Deworming"
      : raw === "vaccine" || raw === "vaccination" ? "Vaccination"
      : "Vaccination";

    // Day name
    let dayName = "";
    if (reminder?.dueDate) {
      try { dayName = DAY_NAMES[new Date(reminder.dueDate).getDay()]; } catch (e) {}
    }

    // Pet emoji
    const petEmoji =
      reminder?.species === "dog" ? "🐶"
      : reminder?.species === "cat" ? "🐱"
      : "🐾";

    // Replace all placeholders
    const message = template.body
      .replace(/{{ownerName}}/g,    reminder?.ownerName  || "Pet Owner")
      .replace(/{{petName}}/g,      reminder?.petName    || "your pet")
      .replace(/{{petEmoji}}/g,     petEmoji)
      .replace(/{{activityType}}/g, activityType)
      .replace(/{{dueDate}}/g,      reminder?.dueDate    || "")
      .replace(/{{dayName}}/g,      dayName)
      .replace(/{{stage}}/g,        reminder?.stage      || "")
      .replace(/{{contact}}/g,      user.phone           || "")
      .replace(/{{senderName}}/g,   senderName);

    res.json({ message });

  } catch (err) {
    console.error("BUILD MESSAGE ERROR:", err);
    res.status(500).json({ message: "Failed to build message" });
  }
});

module.exports = router;