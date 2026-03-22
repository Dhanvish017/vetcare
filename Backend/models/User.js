const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // 🔐 AUTH (OTP LOGIN)
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    otp: { type: String },
    otpExpiresAt: { type: Date },

    // 👤 PROFILE
    name:    { type: String, trim: true },
    email:   { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },

    // 🏥 CLINIC
    clinicName:  { type: String, trim: true },
    accountType: { type: String, enum: ["clinic", "individual"] },

    isProfileComplete: { type: Boolean, default: false },

    // 🛡️ SYSTEM
    role: { type: String, enum: ["user", "admin"], default: "user" },

    whatsappTemplate: { type: String, default: "SIMPLE" },

    stateId: { type: String },

    // ---------------------
    // 📅 SCHEDULE TEMPLATE (V2)
    // ---------------------
    scheduleTemplate: {
      dog: {
        vaccine: [
          {
            stage:       { type: String, default: "" },
            interval:    { type: Number, default: 0 },
            vaccineName: { type: String, default: "" },
          },
        ],
        deworming: [
          {
            interval:      { type: Number, default: 0 },
            dewormingName: { type: String, default: "" },
          },
        ],
      },
      cat: {
        vaccine: [
          {
            stage:       { type: String, default: "" },
            interval:    { type: Number, default: 0 },
            vaccineName: { type: String, default: "" },
          },
        ],
        deworming: [
          {
            interval:      { type: Number, default: 0 },
            dewormingName: { type: String, default: "" },
          },
        ],
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);