const MESSAGE_TEMPLATES = require("./messageTemplates");

const TEMPLATE_MAP = {
  thankyou: "THANK_YOU_SIMPLE",
  missed: "MISSED_FOLLOWUP",
  reminder_v2: "FRIENDLY_V2",
  emotional: "EMOTIONAL_CARING",
};

const safe = (val, fallback) => (val ? val : fallback);

function buildWhatsAppMessage(messageType = "reminder", data = {}) {
  const templateId = TEMPLATE_MAP[messageType] || "FRIENDLY_V1";

  const template =
    MESSAGE_TEMPLATES[templateId] || MESSAGE_TEMPLATES.FRIENDLY_V1;

  // ✅ Sender logic (fixed)
  const senderName =
    data.accountType === "clinic"
      ? safe(data.clinicName, "")
      : `Dr. ${safe(data.doctorName || data.name, "")}`;

  // ✅ Activity type
  const activityType =
    String(data.activityType || "").toLowerCase() === "deworming"
      ? "Deworming"
      : "Vaccination";

  const replacements = {
    ownerName: safe(data.ownerName, "Pet Owner"),
    petName: safe(data.petName, "your pet"),
    petEmoji: safe(data.petEmoji, "🐾"),
    dueDate: safe(data.dueDate, ""),
    contact: safe(data.contact, ""),
    senderName,
    activityType,
  };

  let message = template.body;

  Object.keys(replacements).forEach((key) => {
    message = message.replace(
      new RegExp(`{{${key}}}`, "g"),
      replacements[key]
    );
  });

  return message;
}

module.exports = {
  buildWhatsAppMessage,
};