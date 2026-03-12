const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const messageTemplates = require("../utils/messageTemplates");

// ---------------------
// SAVE SELECTED WHATSAPP TEMPLATE
// ---------------------
router.post("/whatsapp-template", protect, async (req, res) => {
  try {
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: "Template is required" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      whatsappTemplate: templateId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to save template" });
  }
});

// ---------------------
// GET SELECTED WHATSAPP TEMPLATE
// ---------------------
router.get("/whatsapp-template", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("whatsappTemplate");
    res.json({ templateId: user.whatsappTemplate });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// ---------------------
// LIST ALL AVAILABLE TEMPLATES
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

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let template;

    if (messageType === "thankyou") {
      template = messageTemplates.THANK_YOU_SIMPLE;
    } else if (messageType === "missed") {
      template = messageTemplates.MISSED_FOLLOWUP;
    } else {
      template =
        messageTemplates[user.whatsappTemplate] || messageTemplates.FRIENDLY_V1;
    }

    if (!template) {
      return res.status(400).json({ message: "Template not selected" });
    }

    const senderName =
      user.accountType === "doctor"
        ? `Dr. ${user.name || ""}`
        : user.clinicName || "";

    const activityType =
      String(reminder.type || "")
        .trim()
        .toLowerCase() === "deworming"
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
    console.error("BUILD WHATSAPP MESSAGE ERROR:", err);
    res.status(500).json({ message: "Failed to build message" });
  }
});

module.exports = router;