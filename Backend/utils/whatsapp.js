const MESSAGE_TEMPLATES = require("./messageTemplates");

const safe = (val, fallback) => (val ? val : fallback);

// ---------------------
// 🎯 Map messageType → category key in MESSAGE_TEMPLATES
// ---------------------
const TYPE_MAP = {
  reminder:     "REMINDER",
  birthday:     "BIRTHDAY",
  new_owner:    "NEW_OWNER",
  special:      "NEW_OWNER",   // special uses new_owner templates
  thankyou:     "THANK_YOU",
  three_months: "THREE_MONTHS",
  missed:       "MISSED",
};

// ---------------------
// 🎯 Pick random from array
// ---------------------
const pickRandom = (arr) => {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

// ---------------------
// 🎯 Find template by ID across all categories
// ---------------------
const findById = (templateId) => {
  const allTemplates = [
    ...(MESSAGE_TEMPLATES.REMINDER     || []),
    ...(MESSAGE_TEMPLATES.BIRTHDAY     || []),
    ...(MESSAGE_TEMPLATES.NEW_OWNER    || []),
    ...(MESSAGE_TEMPLATES.THANK_YOU    || []),
    ...(MESSAGE_TEMPLATES.THREE_MONTHS || []),
    ...(MESSAGE_TEMPLATES.MISSED       || []),
  ];
  return allTemplates.find((t) => t.id === templateId) || null;
};

// ---------------------
// 🎯 MAIN FUNCTION
// ---------------------
function buildWhatsAppMessage(messageType = "reminder", data = {}, styleId = null) {
  let template = null;

  // If a specific template ID is passed, use it directly
  if (styleId) {
    template = findById(styleId);
  }

  // Otherwise pick randomly from the category
  if (!template) {
    const category = TYPE_MAP[messageType] || "REMINDER";
    const templates = MESSAGE_TEMPLATES[category];
    template = pickRandom(templates);
  }

  // Final fallback
  if (!template) {
    return "Message template not found.";
  }

  // ---------------------
  // 🧠 Sender name
  // ---------------------
  const senderName =
    data.accountType === "clinic"
      ? safe(data.clinicName, "Your Clinic")
      : `Dr. ${safe(data.doctorName || data.name, "Doctor")}`;

  // ---------------------
  // 🧠 Activity type label
  // ---------------------
  const activityTypeRaw = String(data.activityType || data.type || "").toLowerCase();
  const activityType =
    activityTypeRaw === "deworming"
      ? "Deworming"
      : activityTypeRaw === "vaccine" || activityTypeRaw === "vaccination"
      ? "Vaccination"
      : safe(data.activityType, "Vaccination");

  // ---------------------
  // 🧠 Day name from dueDate
  // ---------------------
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let dayName = "";
  if (data.dueDate) {
    try {
      dayName = DAY_NAMES[new Date(data.dueDate).getDay()];
    } catch (e) {
      dayName = "";
    }
  }

  // ---------------------
  // 🧠 All replacements
  // ---------------------
  const replacements = {
    ownerName:    safe(data.ownerName,  "Pet Owner"),
    petName:      safe(data.petName,    "your pet"),
    petEmoji:     safe(data.petEmoji,   "🐾"),
    dueDate:      safe(data.dueDate,    ""),
    dayName,
    activityType,
    stage:        safe(data.stage,      ""),
    contact:      safe(data.contact,    ""),
    senderName,
  };

  // ---------------------
  // 🧠 Replace all {{placeholders}}
  // ---------------------
  let message = template.body;

  Object.keys(replacements).forEach((key) => {
    message = message.replace(
      new RegExp(`{{${key}}}`, "g"),
      replacements[key]
    );
  });

  return message;
}

module.exports = { buildWhatsAppMessage };