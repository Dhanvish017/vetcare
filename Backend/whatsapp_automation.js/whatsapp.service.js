const crypto = require("crypto");
const jwt    = require("jsonwebtoken");
const pool   = require("../config/db");

// ---------------------
// META GRAPH API CONFIG
// ---------------------
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0";
const graphUrl = (path) => `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;

// messageType → { env var holding the Meta-approved template name, clinic toggle column }
const CATEGORY_CONFIG = {
  vaccine:   { envVar: "WHATSAPP_TEMPLATE_VACCINE_NAME",   toggleColumn: "vaccine_reminders" },
  deworming: { envVar: "WHATSAPP_TEMPLATE_DEWORMING_NAME", toggleColumn: "deworming_reminders" },
  missed:    { envVar: "WHATSAPP_TEMPLATE_MISSED_NAME",    toggleColumn: "missed_followups" },
  thankyou:  { envVar: "WHATSAPP_TEMPLATE_THANKYOU_NAME",  toggleColumn: "thank_you_messages" },
};

// ---------------------
// TOKEN ENCRYPTION (AES-256-GCM)
// WHATSAPP_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)
// ---------------------
const getEncryptionKey = () => {
  const keyHex = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)");
  }
  return Buffer.from(keyHex, "hex");
};

const encryptToken = (plainText) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
};

const decryptToken = (payload) => {
  const key = getEncryptionKey();
  const [ivHex, tagHex, dataHex] = String(payload || "").split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Stored WhatsApp access token is malformed");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
};

// ---------------------
// HELPERS
// ---------------------
const normalizePhone = (phone) => String(phone || "").replace(/[^0-9]/g, "");

const buildFrontendRedirect = (status, message = "") => {
  if (!process.env.FRONTEND_URL) return null;
  const url = new URL("/whatsapp/callback", process.env.FRONTEND_URL);
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message);
  return url.toString();
};

// ---------------------
// CONNECT
// Build the Meta OAuth / Embedded Signup dialog URL for this clinic
// ---------------------
const buildAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID,
    redirect_uri:  process.env.META_REDIRECT_URI,
    state,
    response_type: "code",
    config_id:     process.env.META_CONFIG_ID,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
};

const connect = async (userId) => {
  // Signed, time-limited, purpose-scoped state — lets /callback recover the
  // authenticated userId without ever trusting a value from the client.
  const state = jwt.sign(
    { userId, purpose: "whatsapp_connect" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  return {
    success: true,
    url: buildAuthUrl(state),
  };
};

// ---------------------
// CALLBACK — Meta Graph API exchange
// ---------------------
const exchangeCodeForToken = async (code) => {
  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri:  process.env.META_REDIRECT_URI,
    code,
  });
  const response = await fetch(`${graphUrl("oauth/access_token")}?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data?.error?.message || "Failed to exchange authorization code");
  }
  return data;
};

const exchangeForLongLivedToken = async (shortLivedToken) => {
  const params = new URLSearchParams({
    grant_type:        "fb_exchange_token",
    client_id:          process.env.META_APP_ID,
    client_secret:       process.env.META_APP_SECRET,
    fb_exchange_token:  shortLivedToken,
  });
  const response = await fetch(`${graphUrl("oauth/access_token")}?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data?.error?.message || "Failed to obtain long-lived access token");
  }
  return data;
};

// Discover the WABA + phone number the clinic just connected during Embedded Signup
const discoverWabaAndPhoneNumber = async (accessToken) => {
  const businessesRes = await fetch(
    `${graphUrl("me/businesses")}?access_token=${encodeURIComponent(accessToken)}`
  );
  const businesses = await businessesRes.json();
  const businessId = businesses?.data?.[0]?.id;
  if (!businessId) throw new Error("No Meta Business account found for this signup");

  const wabaRes = await fetch(
    `${graphUrl(`${businessId}/owned_whatsapp_business_accounts`)}?access_token=${encodeURIComponent(accessToken)}`
  );
  const wabaData = await wabaRes.json();
  const wabaId = wabaData?.data?.[0]?.id;
  if (!wabaId) throw new Error("No WhatsApp Business Account found for this Meta Business");

  const phoneRes = await fetch(
    `${graphUrl(`${wabaId}/phone_numbers`)}?access_token=${encodeURIComponent(accessToken)}`
  );
  const phoneData = await phoneRes.json();
  const phoneEntry = phoneData?.data?.[0];
  if (!phoneEntry) throw new Error("No WhatsApp phone number found for this WhatsApp Business Account");

  return {
    wabaId,
    phoneNumberId: phoneEntry.id,
    businessName:  phoneEntry.verified_name || null,
    phoneNumber:   phoneEntry.display_phone_number || null,
  };
};

const subscribeAppToWaba = async (wabaId, accessToken) => {
  const response = await fetch(graphUrl(`${wabaId}/subscribed_apps`), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to subscribe app to this WhatsApp Business Account");
  }
  return data;
};

const unsubscribeAppFromWaba = async (wabaId, accessToken) => {
  const response = await fetch(graphUrl(`${wabaId}/subscribed_apps`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to unsubscribe app from WhatsApp Business Account");
  }
  return data;
};

// ---------------------
// CALLBACK
// Handle the redirect Meta sends back after the clinic finishes signup
// ---------------------
const callback = async (req) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    throw new Error(error_description || error);
  }
  if (!code || !state) {
    throw new Error("Missing code or state from Meta redirect");
  }

  let decoded;
  try {
    decoded = jwt.verify(state, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid or expired connection request — please try connecting again");
  }
  if (decoded.purpose !== "whatsapp_connect" || !decoded.userId) {
    throw new Error("Invalid connection request");
  }
  const userId = decoded.userId;

  const shortLived = await exchangeCodeForToken(code);
  const longLived   = await exchangeForLongLivedToken(shortLived.access_token);
  const accessToken = longLived.access_token;

  const { wabaId, phoneNumberId, businessName, phoneNumber } =
    await discoverWabaAndPhoneNumber(accessToken);

  // Register our app to receive delivery/status webhooks for THIS clinic's WABA
  await subscribeAppToWaba(wabaId, accessToken);

  const encryptedToken = encryptToken(accessToken);

  await pool.query(
    `INSERT INTO whatsapp_connections
       (user_id, waba_id, phone_number_id, business_name, phone_number, access_token_encrypted, status, connected_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'connected', NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       waba_id                = EXCLUDED.waba_id,
       phone_number_id        = EXCLUDED.phone_number_id,
       business_name          = EXCLUDED.business_name,
       phone_number            = EXCLUDED.phone_number,
       access_token_encrypted = EXCLUDED.access_token_encrypted,
       status                  = 'connected',
       connected_at            = NOW(),
       updated_at              = NOW()`,
    [userId, wabaId, phoneNumberId, businessName, phoneNumber, encryptedToken]
  );

  return { success: true, redirectUrl: buildFrontendRedirect("success") };
};

// ---------------------
// GET STATUS
// ---------------------
const getStatus = async (userId) => {
  const { rows } = await pool.query(
    `SELECT business_name, phone_number, status, connected_at,
            vaccine_reminders, deworming_reminders, missed_followups,
            thank_you_messages, special_occasion_messages
     FROM whatsapp_connections
     WHERE user_id = $1`,
    [userId]
  );

  const connection = rows[0];
  if (!connection || connection.status !== "connected") {
    return { connected: false };
  }

  return {
    connected:    true,
    businessName: connection.business_name,
    phoneNumber:  connection.phone_number,
    status:       connection.status,
    connectedAt:  connection.connected_at,
    preferences: {
      vaccineReminders:        connection.vaccine_reminders,
      dewormingReminders:      connection.deworming_reminders,
      missedFollowups:         connection.missed_followups,
      thankYouMessages:        connection.thank_you_messages,
      specialOccasionMessages: connection.special_occasion_messages,
    },
  };
};

// ---------------------
// DISCONNECT
// ---------------------
const disconnect = async (userId) => {
  const { rows } = await pool.query(
    `SELECT waba_id, access_token_encrypted
     FROM whatsapp_connections
     WHERE user_id = $1 AND status = 'connected'`,
    [userId]
  );

  const connection = rows[0];
  if (!connection) {
    return { success: true, message: "No active WhatsApp connection to disconnect" };
  }

  // Best-effort: tell Meta to stop sending webhooks for this WABA.
  // Never let a Meta-side failure block the local disconnect.
  try {
    const accessToken = decryptToken(connection.access_token_encrypted);
    await unsubscribeAppFromWaba(connection.waba_id, accessToken);
  } catch (err) {
    console.error("WHATSAPP UNSUBSCRIBE WARNING:", err.message);
  }

  await pool.query(
    `UPDATE whatsapp_connections
     SET status = 'disconnected', access_token_encrypted = NULL, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  return { success: true, message: "WhatsApp disconnected" };
};

// ---------------------
// SEND WHATSAPP TEMPLATE (Cloud API)
// Reusable low-level sender — one clinic's own WABA/token/number only
// ---------------------
const sendWhatsAppTemplate = async ({ userId, toPhone, category, variables = [] }) => {
  const config = CATEGORY_CONFIG[category];
  if (!config) throw new Error(`Unknown WhatsApp template category: ${category}`);

  const templateName = process.env[config.envVar];
  if (!templateName) throw new Error(`Missing ${config.envVar} in environment`);

  const { rows } = await pool.query(
    `SELECT phone_number_id, access_token_encrypted, ${config.toggleColumn} AS enabled
     FROM whatsapp_connections
     WHERE user_id = $1 AND status = 'connected'`,
    [userId]
  );

  const connection = rows[0];
  if (!connection) {
    return { success: false, skipped: true, reason: "WhatsApp not connected for this clinic" };
  }
  if (connection.enabled === false) {
    return { success: false, skipped: true, reason: `${category} messages are disabled for this clinic` };
  }

  const to = normalizePhone(toPhone);
  if (!to) throw new Error("Invalid recipient phone number");

  const accessToken = decryptToken(connection.access_token_encrypted);

  const response = await fetch(graphUrl(`${connection.phone_number_id}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en_US" },
        components: variables.length
          ? [{ type: "body", parameters: variables.map((v) => ({ type: "text", text: String(v) })) }]
          : [],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to send WhatsApp template message");
  }

  return { success: true, messageId: data.messages?.[0]?.id || null };
};

// ---------------------
// SEND SCHEDULE REMINDER
// High-level entry point for vaccine/deworming/missed/thank-you automation.
// Sends the template, then logs the outcome into reminder_logs the same way
// the existing manual notification endpoints already do.
// ---------------------
const sendScheduleReminder = async ({
  userId,
  animalId,
  ownerId,
  ownerPhone,
  category,
  variables = [],
  reminderWindow = "today",
}) => {
  const result = await sendWhatsAppTemplate({ userId, toPhone: ownerPhone, category, variables });

  if (result.success) {
    await pool.query(
      `INSERT INTO reminder_logs
         (user_id, animal_id, owner_id, type, reminder_window, sent, sent_at, message_template, message_category)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), $6, $7)`,
      [userId, animalId, ownerId, category, reminderWindow, process.env[CATEGORY_CONFIG[category].envVar], category]
    );
  }

  return result;
};

// ---------------------
// WEBHOOKS
// ---------------------
const verifyWebhookChallenge = (query) => {
  const mode      = query["hub.mode"];
  const token     = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
};

// Basic shape check for an incoming Meta webhook payload before we spend
// time processing it — Meta always expects a fast 200 either way.
const isValidWebhookPayload = (body) => {
  return (
    !!body &&
    body.object === "whatsapp_business_account" &&
    Array.isArray(body.entry)
  );
};

const verifySignature = (rawBody, signatureHeader) => {
  if (!signatureHeader || !rawBody) return false;

  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
};

// Best-effort: mark the most recent un-sent reminder_logs row for this
// clinic + owner phone as delivered. reminder_logs has no wamid column,
// so an exact 1:1 match against the outbound message isn't possible —
// this is the closest we can get without altering the existing schema.
const applyDeliveryStatus = async (userId, recipientPhone) => {
  await pool.query(
    `UPDATE reminder_logs
     SET sent = true, sent_at = COALESCE(sent_at, NOW())
     WHERE id = (
       SELECT rl.id FROM reminder_logs rl
       JOIN owners o ON o.id = rl.owner_id
       WHERE rl.user_id = $1
         AND regexp_replace(o.phone, '[^0-9]', '', 'g') = $2
         AND rl.sent IS DISTINCT FROM true
       ORDER BY rl.created_at DESC
       LIMIT 1
     )`,
    [userId, recipientPhone]
  );
};

const processWebhookEvent = async (body) => {
  const entries = body?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const { rows } = await pool.query(
        `SELECT user_id FROM whatsapp_connections WHERE phone_number_id = $1`,
        [phoneNumberId]
      );
      const userId = rows[0]?.user_id;
      if (!userId) continue;

      for (const statusUpdate of value.statuses || []) {
        const recipient = normalizePhone(statusUpdate.recipient_id);

        if (statusUpdate.status === "failed") {
          console.error("WHATSAPP MESSAGE FAILED:", {
            wamid:     statusUpdate.id,
            recipient,
            errors:    statusUpdate.errors,
          });
          continue;
        }

        if (statusUpdate.status === "delivered" || statusUpdate.status === "read") {
          await applyDeliveryStatus(userId, recipient);
        }
        // "sent" is an intermediate state — nothing to persist for it.
      }

      // Inbound messages from pet owners are received but not auto-processed in this phase.
      if (Array.isArray(value.messages) && value.messages.length > 0) {
        console.log("WHATSAPP INBOUND MESSAGE RECEIVED:", {
          phoneNumberId,
          count: value.messages.length,
        });
      }
    }
  }
};

module.exports = {
  connect,
  callback,
  getStatus,
  disconnect,
  sendWhatsAppTemplate,
  sendScheduleReminder,
  verifyWebhookChallenge,
  verifySignature,
  isValidWebhookPayload,
  processWebhookEvent,
  buildFrontendRedirect,
};
