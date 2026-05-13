// =============================
// BACKEND MESSAGE TEMPLATES
// Placeholders: {{ownerName}} {{petName}} {{activityType}} {{stage}} {{dueDate}} {{dayName}} {{senderName}}
// =============================

module.exports = {

  // ---------------------
  // 💉 REMINDER
  // ---------------------
  REMINDER: [
    {
      id: "SIMPLE",
      label: "Simple (Default)",
      body: `Hello *{{ownerName}}*, your *{{petName}}*'s *{{activityType}}* is due on *{{dayName}} {{dueDate}}*. 🐾\n— *{{senderName}}*`,
    },
    {
      id: "SIMPLE2",
      label: "Simple2",
      body: `Hey *{{ownerName}}*, 😄 ನಿಮ್ busy schedule ಗೊತ್ತು 👍 But *{{petName}}* ನಾ calendar remind ಮಾಡ್ತಾ ಇಧೆ 😂🐶\n*{{activityType}}* is due ಇಧೆ on *{{dayName}} {{dueDate}}* 🐾 Happy to plan for you\n— *{{senderName}}*`,
    },
    {
      id: "EMOTIONAL",
      label: "Emotional & Caring ❤️",
      body: `Dear *{{ownerName}}*,\n\nWe know that *{{petName}}* is not just a pet, but a beloved family member. The love and care you show truly matter.\n\nThis is a gentle reminder that *{{petName}}*'s *{{activityType}}* is due on *{{dayName}} {{dueDate}}*.\n\nRegular care helps protect them from illness and discomfort ❤️\n\n— *{{senderName}}*`,
    },
    {
      id: "PRICE",
      label: "Price Sensitive 💰",
      body: `Vaccination is one of the most cost-effective ways to protect your pet *{{petName}}*.\n\nNext due: *{{activityType}}* on *{{dayName}} {{dueDate}}* 👍\n\n— *{{senderName}}*`,
    },
    {
      id: "OWNER",
      label: "Owner-Centric ❤️",
      body: `Dear *{{ownerName}}*,\n\nWe know how much you care for *{{petName}}* ❤️\n\nYou've always ensured they get the very best — *{{petName}}* is scheduled for *{{stage}}* dose of *{{activityType}}* on *{{dayName}} {{dueDate}}*.\n\nJust continuing the thoughtful care you already give 👍\nPlease make a visit.\n\n— *{{senderName}}*`,
    },
    {
      id: "HUMOUR",
      label: "Humour 😄",
      body: `Hi *{{ownerName}}*, 😊 Looks like *{{petName}}* growing fast ah 😄\n\nNext milestone = *{{activityType}}* time 👍 on *{{dayName}} {{dueDate}}*\n\nDon't worry, a small injection 💉 just 2 mins work 😄 Treats compulsory after 😄❤️\n\n— *{{senderName}}*`,
    },
    {
      id: "HUMOUR2",
      label: "Humour2 😄",
      body: `Hey *{{ownerName}}*, 😊\n\n*{{petName}}* ಹೇಳ್ತಾ ಇದ್ರು — 'ನನ್ನ parent ತುಂಬಾ caring' 😄, & THE BEST ❤️ but ಸ್ವಲ್ಪ date ನೆನಪು ಇಟ್ಟುಕೊಳ್ಳೋಧೆ ಕಷ್ಟ 😜❤️ so ಸ್ವಲ್ಪ remind ಮಾಡಿ.\n\nSo just one small thing… *{{activityType}}* due ಇಧೆ 👍 on *{{dayName}} {{dueDate}}*\nWe'll be happy to arrange this at your convenience.\n\n— *{{senderName}}*`,
    },
  ],

  // ---------------------
  // 🎂 BIRTHDAY
  // ---------------------
  BIRTHDAY: [
    {
      id: "BIRTHDAY_WARM",
      label: "Warm Birthday",
      body: `Hi *{{ownerName}}*,\n\nWishing a very happy birthday to dear *{{petName}}* 🎉🐾\nIt's a joy to see them growing with so much love and care by your side.\nHere's to many more happy, healthy years ahead 💛\n\n— *{{senderName}}*`,
    },
    {
      id: "BIRTHDAY_FUN",
      label: "Fun Birthday 😄",
      body: `Hey *{{ownerName}}* 😊 Just checking… celebrations started or not? 🎉🐶\nBecause it's someone's special day today!\n\nHappy Birthday ❤️ *{{petName}}*\n\n— *{{senderName}}*`,
    },
    {
      id: "BIRTHDAY_FUN2",
      label: "Fun Birthday 2 😄",
      body: `Hey 😄 *{{petName}}* today officially 1 year more mischief expert 😂🐾\nHappy Birthday 🎉 Treats double beku!\n\n— *{{senderName}}*`,
    },
    {
      id: "BIRTHDAY_FUN3",
      label: "Fun Birthday 3 😄",
      body: `Hey 😄 ಇವತ್ತು *{{petName}}* acting like celebrity aa? ⭐🐶\nBirthday vibes fulllllllllll swing 😂🎉 many more returns of the day 🐾❤️\n\n— *{{senderName}}*`,
    },
  ],

  // ---------------------
  // 🐾 NEW OWNER
  // ---------------------
  NEW_OWNER: [
    {
      id: "NEW_WARM",
      label: "Warm Welcome",
      body: `Hi *{{ownerName}}*,\n\nThere's something magical about bringing home a little star like *{{petName}}* 🐾✨\nLife instantly feels warmer, happier, and more alive.\n\nAnd the way you've welcomed them already shows the kind of amazing pet parent you are 💛\n\nHappy to walk this journey with you.\n\n— *{{senderName}}*`,
    },
    {
      id: "NEW_FUN",
      label: "Fun Welcome 😄",
      body: `Hi *{{ownerName}}*,\n\n*{{petName}}* ತರಾ ಒಂದು ಚಿಕ್ಕ star ಅನ್ನು ಮನೆಗೆ welcome ಮಾಡೋದು ಅಂದ್ರೆ… ಅದು ಒಂದು magic feel 🐾✨\nLife ಸ್ವಲ್ಪ ಹೆಚ್ಚು happy ಮತ್ತು ಹೆಚ್ಚು warm ಆಗುತ್ತೆ 💛\n\nನೀವು ಒಂದು ತುಂಬಾ beautiful journey start ಮಾಡಿದ್ದೀರ.\nHappy to be a small part of your journey.\n\n— *{{senderName}}*`,
    },
    {
      id: "NEW_FUN2",
      label: "Fun Welcome 2 😄",
      body: `Hey *{{ownerName}}* 👋 Congrats on your new baby 🐶❤️\n\n*{{petName}}* already looks like a boss at home 😄\n\nWe're always here for you 👍\n\n— *{{senderName}}*`,
    },
  ],

  // ---------------------
  // 🙏 THANK YOU
  // ---------------------
  THANK_YOU: [
    {
      id: "THANK_SIMPLE",
      label: "Simple Thank You",
      body: `Thank you for visiting us today ❤️\n\nWe appreciate your trust in our care for *{{petName}}*.\n\n— *{{senderName}}*`,
    },
    {
      id: "THANK_FUN",
      label: "Friendly Thank You 😄",
      body: `Nice meeting *{{petName}}* today 🐾 Clinic full charm 😂❤️\n\n— *{{senderName}}*`,
    },
  ],

  // ---------------------
  // 📅 THREE MONTHS CHECK-IN
  // ---------------------
  THREE_MONTHS: [
    {
      id: "THREE_MONTHS_WARM",
      label: "Warm Check-in",
      body: `Just checking in ❤️\n\nHow is *{{petName}}* doing these days?\n\n— *{{senderName}}*`,
    },
    {
      id: "THREE_MONTHS_FUN",
      label: "Fun Check-in 😄",
      body: `Hi 😄 just checking… ನಿಮ್ಮ *{{petName}}* still ruling the house ah? 🐶👑\n\n— *{{senderName}}*`,
    },
  ],

  // ---------------------
  // ⚠ MISSED FOLLOW-UP
  // ---------------------
  MISSED: [
    {
      id: "MISSED_CARING",
      label: "Caring Follow-up",
      body: `Dear *{{ownerName}}*,\n\nWe wanted to personally reach out regarding *{{petName}}* ❤️\n\nIt seems their *{{activityType}}* may have been missed recently. While it's absolutely understandable, we gently recommend scheduling it soon to ensure they remain fully protected and comfortable.\n\nPlease let us know a convenient time — we'll make it as smooth as possible for you.\n\nWith care,\n— *{{senderName}}*`,
    },
    {
      id: "MISSED_FRIENDLY",
      label: "Friendly Follow-up 😊",
      body: `Hey 👋 busy ಆಗಿದಿರಿ ಅಂತ ಗೊತ್ತು 😊 it's absolutely understandable.\n\n*{{petName}}* vaccination miss ಆಗಿದೆ 🐾 No tension — ನಾವು adjust ಮಾಡ್ತೀವಿ 👍\n\n— *{{senderName}}*`,
    },
  ],
};