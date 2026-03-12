const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ---------------------
// CREATE / UPDATE USER PROFILE
// ---------------------
router.put("/", protect, async (req, res) => {
  try {
    const { name, email, address, clinicName, accountType } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (address) user.address = address;

    if (accountType) {
      user.accountType = accountType;
      if (accountType === "clinic") {
        user.clinicName = clinicName || "";
      } else {
        user.clinicName = "";
      }
    }

    user.isProfileComplete = true;
    await user.save();

    res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        clinicName: user.clinicName,
        isProfileComplete: user.isProfileComplete,
      },
    });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to create account" });
  }
});

// ---------------------
// FETCH USER PROFILE
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-otp -otpExpiresAt -stateId"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      address: user.address,
      accountType: user.accountType,
      clinicName: user.clinicName,
      isProfileComplete: user.isProfileComplete,
      role: user.role,
    });
  } catch (err) {
    console.error("FETCH PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

module.exports = router;