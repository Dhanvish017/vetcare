const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");


// ---------------------
// SEND OTP (DEV MODE)
// ---------------------
router.post("/send-otp", async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone missing" });
    }

    phone = phone.replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    if (phone.length !== 12) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const otp = "1234";
    const expiresAt = Date.now() + 5 * 60 * 1000;

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        otp,
        otpExpiresAt: expiresAt,
        isProfileComplete: false,
      });
    } else {
      user.otp = otp;
      user.otpExpiresAt = expiresAt;
      await user.save();
    }

    console.log("DEV OTP SENT:", phone, otp);
    res.json({ success: true });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ message: "OTP send failed" });
  }
});

// ---------------------
// VERIFY OTP (DEV MODE)
// ---------------------
router.post("/verify-otp", async (req, res) => {
  try {
    let { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone or OTP missing" });
    }

    phone = phone.replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    if (phone.length !== 12) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const user = await User.findOne({ phone });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpiresAt < Date.now()) return res.status(400).json({ message: "OTP expired" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({
      token,
      isProfileComplete: user.isProfileComplete,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;