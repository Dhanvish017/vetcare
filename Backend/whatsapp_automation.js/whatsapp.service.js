// ---------------------
// WhatsApp Service
// Phase 1: placeholder logic only — no Meta Cloud API, OAuth, or DB calls yet
// ---------------------

// ---------------------
// CONNECT
// Start the flow for a doctor to connect their WhatsApp Business account
// ---------------------
const connect = async (userId) => {
  // TODO: Build the Meta Embedded Signup URL (client_id, redirect_uri, state = userId)
  // TODO: Store a temporary "state" value linked to userId to verify the callback later
  // TODO: Redirect the doctor to the Meta Embedded Signup flow

  return {
    success: true,
    message: "WhatsApp connect flow not yet implemented",
  };
};

// ---------------------
// CALLBACK
// Handle the redirect Meta sends back after the doctor finishes Embedded Signup
// ---------------------
const callback = async (req) => {
  // TODO: Read "code" and "state" from req.query
  // TODO: Verify "state" matches the userId that started the connect flow
  // TODO: Exchange the authorization code for a WhatsApp Business access token via Meta API
  // TODO: Save the access token, WABA ID, and phone number ID to Supabase for this user
  // TODO: Redirect the doctor back to the frontend with a success/failure status

  return {
    success: true,
    message: "WhatsApp callback flow not yet implemented",
  };
};

// ---------------------
// GET STATUS
// Check whether a doctor has already connected a WhatsApp Business account
// ---------------------
const getStatus = async (userId) => {
  // TODO: Query Supabase for this user's saved WhatsApp connection details
  // TODO: Return whether the account is connected, plus basic info (e.g. phone number)

  return {
    connected: false,
    message: "WhatsApp status check not yet implemented",
  };
};

// ---------------------
// DISCONNECT
// Remove a doctor's connected WhatsApp Business account
// ---------------------
const disconnect = async (userId) => {
  // TODO: Clear the saved WhatsApp access token and account details from Supabase
  // TODO: Optionally revoke the token with Meta

  return {
    success: true,
    message: "WhatsApp disconnect flow not yet implemented",
  };
};

module.exports = { connect, callback, getStatus, disconnect };
