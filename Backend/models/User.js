const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true, // ✅ phone is identity
    index: true,
  },

  otp: {
    type: String,
  },

  otpExpiresAt: {
    type: Date,
  },

  // optional profile (filled later)
  name: {
    type: String,
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);

module.exports = mongoose.model("User", userSchema);




// Hash password before saving (in signup)
/*userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});*/

