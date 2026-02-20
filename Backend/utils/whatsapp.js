const MESSAGE_TEMPLATES = require("./messageTemplates");

function buildWhatsAppMessage(messageType = "reminder", data = {}) {
  let templateId = "FRIENDLY_V1"; // default reminder

  // 🔥 Decide template based on messageType
  if (messageType === "thankyou") {
    templateId = "THANK_YOU_SIMPLE";
  } else if (messageType === "missed") {
    templateId = "MISSED_FOLLOWUP";
  } else if (messageType === "reminder_v2") {
    templateId = "FRIENDLY_V2";
  } else if (messageType === "emotional") {
    templateId = "EMOTIONAL_CARING";
  }

  const template =
    MESSAGE_TEMPLATES[templateId] || MESSAGE_TEMPLATES.FRIENDLY_V1;

  // 🔥 Decide sender automatically
  const senderName =
    data.accountType === "doctor"
      ? `Dr. ${data.doctorName || ""}`
      : data.clinicName || "";

  // 🔥 Decide activity type automatically
  const activityType =
    data.activityType === "deworming"
      ? "Deworming"
      : "Vaccination";

  return template.body
    .replace(/{{ownerName}}/g, data.ownerName || "")
    .replace(/{{petName}}/g, data.petName || "")
    .replace(/{{petEmoji}}/g, data.petEmoji || "🐾")
    .replace(/{{dueDate}}/g, data.dueDate || "")
    .replace(/{{contact}}/g, data.contact || "")
    .replace(/{{senderName}}/g, senderName)
    .replace(/{{activityType}}/g, activityType);
}

module.exports = {
  buildWhatsAppMessage,
};