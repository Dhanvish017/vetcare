module.exports = {
  // ---------------------
  // 🐾 NEW OWNER
  // ---------------------
  NEW_OWNER: [
    {
      id: "NEW_OWNER_1",
      label: "New Owner - Warm",
      body: `
Hi *{{ownerName}}*,

There’s something magical about bringing home a little star like *{{petName}}* 🐾✨  
Life instantly feels warmer, happier, and more alive 💛  

Happy to walk this journey with you.

— *{{senderName}}*
`.trim(),
    },
    {
      id: "NEW_OWNER_2",
      label: "New Owner - Friendly",
      body: `
Hey *{{ownerName}}* 👋  

Congrats on your new baby 🐶❤️  
*{{petName}}* already looks like a boss at home 😄  

We’re always here for you 👍  

— *{{senderName}}*
`.trim(),
    },
  ],

  // ---------------------
  // 🎂 BIRTHDAY
  // ---------------------
  BIRTHDAY: [
    {
      id: "BIRTHDAY_1",
      label: "Birthday - Warm",
      body: `
Hi *{{ownerName}}*,

Wishing a very happy birthday to dear *{{petName}}* 🎉🐾  
Here’s to many more happy, healthy years ahead 💛  

— *{{senderName}}*
`.trim(),
    },
    {
      id: "BIRTHDAY_2",
      label: "Birthday - Fun",
      body: `
Hey 😄  

*{{petName}}* is now officially one year more mischievous 😂🐾  
Happy Birthday 🎉  

Treats double today 😄❤️
`.trim(),
    },
  ],

  // ---------------------
  // ❤️ LOYALTY / CHECK-IN
  // ---------------------
  LOYALTY: [
    {
      id: "LOYALTY_1",
      label: "Check-in - Simple",
      body: `
Hi *{{ownerName}}* ❤️  

Just checking in…  
How is *{{petName}}* doing these days? 🐾  

— *{{senderName}}*
`.trim(),
    },
    {
      id: "LOYALTY_2",
      label: "Check-in - Fun",
      body: `
Hey 😄  

Just checking… your pet still being naughty ah? 🐶❤️  
`.trim(),
    },
  ],

  // ---------------------
  // 💉 REMINDER (MAIN)
  // ---------------------
  REMINDER: {
    SIMPLE: [
      {
        id: "REMINDER_SIMPLE_1",
        label: "Simple Reminder",
        body: `
Hello *{{ownerName}}*,  

Your *{{petName}}*’s *{{activityType}}* is due on *{{dueDate}}*.  

— *{{senderName}}* 🐾
`.trim(),
      },
    ],

    EMOTIONAL: [
      {
        id: "REMINDER_EMOTIONAL_1",
        label: "Emotional Reminder",
        body: `
Dear *{{ownerName}}*,  

We know *{{petName}}* is not just a pet, but a beloved family member ❤️  

This is a gentle reminder that *{{activityType}}* is due on *{{dueDate}}*.  

With care,  
*{{senderName}}*
`.trim(),
      },
    ],

    PRICE: [
      {
        id: "REMINDER_PRICE_1",
        label: "Price Sensitive",
        body: `
Hi 👋 *{{ownerName}}*,  

Vaccination for *{{petName}}* is due on *{{dueDate}}*.  

It’s one of the most cost-effective ways to protect them 👍  

— *{{senderName}}*
`.trim(),
      },
    ],

    OWNER: [
      {
        id: "REMINDER_OWNER_1",
        label: "Owner-Centric",
        body: `
Dear *{{ownerName}}*,  

We know how much you care for *{{petName}}* ❤️  

Next step: *{{activityType}}* on *{{dueDate}}*.  

Just continuing the great care you already give 👍  

— *{{senderName}}*
`.trim(),
      },
    ],
  },

  // ---------------------
  // 🙏 THANK YOU
  // ---------------------
  THANK_YOU: [
    {
      id: "THANK_YOU_1",
      label: "Thank You Simple",
      body: `
Thank you for visiting us today ❤️  

We appreciate your trust in our care for *{{petName}}*.  

— *{{senderName}}*
`.trim(),
    },
  ],

  // ---------------------
  // ⚠ MISSED FOLLOW-UP
  // ---------------------
  MISSED: [
    {
      id: "MISSED_1",
      label: "Missed - Caring",
      body: `
Dear *{{ownerName}}*,  

We noticed *{{petName}}*’s *{{activityType}}* may have been missed.  

We recommend scheduling it soon to keep them protected 🐾  

— *{{senderName}}*
`.trim(),
    },
  ],
};