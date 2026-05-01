const MESSAGE_TEMPLATES = require("./messageTemplates");

const safe = (val, fallback) => (val ? val : fallback);

// 🎯 Map message type → category
const TYPE_MAP = {
  reminder: "REMINDER",
  birthday: "BIRTHDAY",
  new_owner: "NEW_OWNER",
  loyalty: "LOYALTY",
  thankyou: "THANK_YOU",
  missed: "MISSED",
};

// 🎯 Default styles
const DEFAULT_STYLE = {
  REMINDER: "SIMPLE",
};

// 🎯 Get random template from array
const pickRandom = (arr) => {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

function buildWhatsAppMessage(messageType = "reminder", data = {}, style = null) {
  const category = TYPE_MAP[messageType] || "REMINDER";

  let template;

  // ---------------------
  // 🧠 HANDLE REMINDER (nested)
  // ---------------------
  if (category === "REMINDER") {
    const selectedStyle = style || DEFAULT_STYLE.REMINDER;

    const templates =
      MESSAGE_TEMPLATES.REMINDER[selectedStyle] ||
      MESSAGE_TEMPLATES.REMINDER.SIMPLE;

    template = pickRandom(templates);
  } else {
    // ---------------------
    // 🧠 HANDLE OTHER TYPES (array)
    // ---------------------
    const templates = MESSAGE_TEMPLATES[category];

    template = pickRandom(templates);
  }

  // fallback safety
  if (!template) {
    return "Message template not found.";
  }

  // ---------------------
  // 🧠 Sender logic
  // ---------------------
  const senderName =
    data.accountType === "clinic"
      ? safe(data.clinicName, "")
      : `Dr. ${safe(data.doctorName || data.name, "")}`;

  // ---------------------
  // 🧠 Activity type
  // ---------------------
  const activityType =
    String(data.activityType || "").toLowerCase() === "deworming"
      ? "Deworming"
      : "Vaccination";

  // ---------------------
  // 🧠 Replacements
  // ---------------------
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