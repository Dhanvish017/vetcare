const express = require("express");
const router = express.Router();
const Animal = require("../models/Pet");
const { protect } = require("../middleware/auth");

// ---------------------
// DASHBOARD: TOTAL STATS
// ---------------------
router.get("/stats", protect, async (req, res) => {
  try {
    const animals = await Animal.find({ user: req.user.id });

    let vaccinePending = 0;
    let vaccineCompleted = 0;
    let dewormingPending = 0;
    let dewormingCompleted = 0;

    animals.forEach((animal) => {
      if (animal.vaccineInfo?.vaccineType) {
        if (animal.vaccineInfo.vaccineStatus === "completed") {
          vaccineCompleted++;
        } else {
          vaccinePending++;
        }
      }

      if (animal.dewormingInfo?.dewormingName) {
        if (animal.dewormingInfo.dewormingStatus === "completed") {
          dewormingCompleted++;
        } else {
          dewormingPending++;
        }
      }
    });

    res.json({
      vaccine: { pending: vaccinePending, completed: vaccineCompleted },
      deworming: { pending: dewormingPending, completed: dewormingCompleted },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;