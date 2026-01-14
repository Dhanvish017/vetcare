const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // 🔐 AUTH (OTP LOGIN)
    phone: {
      type: String,
      required: true,
      unique: true,       // phone = identity
      index: true,
    },

    otp: {
      type: String,
    },

    otpExpiresAt: {
      type: Date,
    },

    // 👤 PROFILE (CREATE ACCOUNT SCREEN)
    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    // 🏥 CLINIC SUPPORT
    clinicName: {
      type: String,
      trim: true,
    },

    accountType: {
      type: String,
      enum: ["clinic", "individual"],
    },

    // ✅ VERY IMPORTANT FLAG
    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    // 🛡️ SYSTEM
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("User", userSchema);






// Hash password before saving (in signup)
/*userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});*/

