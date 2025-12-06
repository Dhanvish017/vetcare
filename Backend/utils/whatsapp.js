const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

module.exports = async function sendWhatsapp(to, text) {
  return client.messages.create({
    from: "whatsapp:+14155238886",  // Sandbox number
    to: `whatsapp:${to}`,
    body: text
  });
};


