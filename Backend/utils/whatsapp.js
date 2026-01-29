const MESSAGE_TEMPLATES = require("./messageTemplates");

/**
 * Build WhatsApp message based on selected template
 * @param {String} templateId - template key saved in User (e.g. FRIENDLY_V1)
 * @param {Object} data - dynamic values
 */
function buildWhatsAppMessage(templateId, data) {
  const template =
    MESSAGE_TEMPLATES[templateId] || MESSAGE_TEMPLATES.FRIENDLY_V1;

  return template.body
    .replace(/{{ownerName}}/g, data.ownerName)
    .replace(/{{petName}}/g, data.petName)
    .replace(/{{vaccine}}/g, data.vaccine)
    .replace(/{{dueDate}}/g, data.dueDate)
    .replace(/{{contact}}/g, data.contact)
    .replace(/{{clinicName}}/g, data.clinicName)
    .replace(/{{doctorName}}/g, data.doctorName);
}

module.exports = {
  buildWhatsAppMessage,
};

