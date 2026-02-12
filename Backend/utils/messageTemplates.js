module.exports = {
  FRIENDLY_V1: {
    id: "FRIENDLY_V1",
    label: "Simple Reminder Version 1",
    body: `
Hi *{{ownerName}}* 👋

It’s a gentle reminder.
Your *{{petName}}* {{petEmoji}} is due for *{{activityType}}* on *{{dueDate}}*.

– From *{{senderName}}*
📞 *{{contact}}*
`.trim(),
  },

  FRIENDLY_V2: {
    id: "FRIENDLY_V2",
    label: "Simple Reminder Version 2",
    body: `
Hello *{{ownerName}}*,

Your *{{petName}}* is due for *{{activityType}}* on *{{dueDate}}*.

Please contact *{{contact}}*

– *{{senderName}}*
`.trim(),
  },

  EMOTIONAL_CARING: {
    id: "EMOTIONAL_CARING",
    label: "Emotional & Caring Reminder",
    body: `
Dear *{{ownerName}}*,

We know that *{{petName}}* is not just a pet, but a beloved family member ❤️  
The love and care you show truly matter.

This is a gentle reminder that *{{petName}}*’s *{{activityType}}* is due on *{{dueDate}}*.

Regular care helps protect them from illness and discomfort.

Please call *{{contact}}* to book an appointment.

With care,  
*{{senderName}}* 🐾
`.trim(),
  },

  THANK_YOU_SIMPLE: {
    id: "THANK_YOU_SIMPLE",
    label: "Thank You After Visit",
    body: `
Thank you for visiting us today ❤️

We truly appreciate your trust in our care for *{{petName}}*.

— *{{senderName}}*
`.trim(),
  },

  MISSED_FOLLOWUP: {
    id: "MISSED_FOLLOWUP",
    label: "Missed Follow-up (Vaccine / Deworming)",
    body: `
Hello *{{ownerName}}*,

We noticed that *{{petName}}*’s *{{activityType}}* is overdue.

Delaying this can increase health risks.  
Please contact *{{contact}}* to schedule a visit at the earliest.

We’re here to help 🐾  
— *{{senderName}}*
`.trim(),
  },
};


  