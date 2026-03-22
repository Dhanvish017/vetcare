const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ---------------------
// GET SCHEDULE TEMPLATE
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("scheduleTemplate");
    res.json({ scheduleTemplate: user.scheduleTemplate || null });
  } catch (err) {
    console.error("GET TEMPLATE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// ---------------------
// SAVE SCHEDULE TEMPLATE
// ---------------------
router.put("/", protect, async (req, res) => {
  try {
    const { scheduleTemplate } = req.body;

    await User.findByIdAndUpdate(req.user.id, { scheduleTemplate });

    res.json({ success: true, message: "Template saved" });
  } catch (err) {
    console.error("SAVE TEMPLATE ERROR:", err);
    res.status(500).json({ message: "Failed to save template" });
  }
});

module.exports = router;