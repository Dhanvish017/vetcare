const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// ---------------------
// SEND OTP
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
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 🔍 Check user
    const userResult = await pool.query(
      "SELECT * FROM users WHERE phone = $1",
      [phone]
    );

    let user = userResult.rows[0];

    if (!user) {
      // ➕ Create user
      const newUser = await pool.query(
        `INSERT INTO users (phone, otp, otp_expires_at, is_profile_complete)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [phone, otp, expiresAt, false]
      );
      user = newUser.rows[0];
    } else {
      // 🔄 Update OTP
      await pool.query(
        `UPDATE users
         SET otp = $1, otp_expires_at = $2
         WHERE phone = $3`,
        [otp, expiresAt, phone]
      );
    }

    console.log("DEV OTP SENT:", phone, otp);
    res.json({ success: true });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ message: "OTP send failed" });
  }
});


// ---------------------
// VERIFY OTP
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

    const result = await pool.query(
      "SELECT * FROM users WHERE phone = $1",
      [phone]
    );

    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const token = jwt.sign(
      { id: user.id }, // ⚠️ PostgreSQL uses id (not _id)
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    // 🔄 Clear OTP
    await pool.query(
      `UPDATE users
       SET otp = NULL, otp_expires_at = NULL
       WHERE id = $1`,
      [user.id]
    );

    res.json({
      token,
      isProfileComplete: user.is_profile_complete,
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;