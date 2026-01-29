/**
 * WhatsApp Message Templates
 * Controlled by system (doctors only select, cannot edit)
 * Variables will be replaced dynamically before sending
 */

module.exports = {
    FRIENDLY_V1: {
      id: "FRIENDLY_V1",
      label: "Friendly Version 1",
      body: `
  Hello {{ownerName}} 👋
  
  Just a friendly reminder that {{petName}} is due for the {{vaccine}} vaccination on {{dueDate}} 🐾
  Vaccines help keep your pet healthy, active, and protected. We’d love to take care of {{petName}}.
  
  📞 Call or WhatsApp us at {{contact}} to book an appointment.
  
  — {{clinicName}}
      `.trim(),
    },
  
    FRIENDLY_V2: {
      id: "FRIENDLY_V2",
      label: "Friendly Version 2",
      body: `
  Hi {{ownerName}} 😊
  
  Hope you and {{petName}} are doing well!
  This is a reminder that {{petName}}’s {{vaccine}} vaccine is due on {{dueDate}}. Staying on schedule helps avoid health problems later.
  
  Please reach out to us at {{contact}} and we’ll fix a suitable time for your visit 🐶🐱
  
  — Your friends at {{clinicName}}
      `.trim(),
    },
  
    EMOTIONAL_CARING: {
      id: "EMOTIONAL_CARING",
      label: "Emotional & Caring Version",
      body: `
  Dear {{ownerName}},
  
  At {{clinicName}}, we know that {{petName}} is not just a pet, but a beloved family member ❤️
  This is a gentle reminder that {{petName}} is due for the {{vaccine}} vaccination on {{dueDate}}.
  Vaccination is one of the simplest ways to protect them from discomfort and illness.
  
  We would be honoured to care for {{petName}}.
  Please call {{contact}} to book an appointment—we’re here for you and your pet.
  
  With care,
  Dr. {{doctorName}} & Team 🐾
      `.trim(),
    },
  };
  