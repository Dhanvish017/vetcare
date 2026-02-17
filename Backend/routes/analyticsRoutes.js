const express = require("express");
const router = express.Router();
const Animal = require("../models/Pet");
const ReminderLog = require("../models/ReminderLog");
const { protect } = require("../middleware/auth");

router.get("/today", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // -------------------------
    // 🕒 TODAY RANGE
    // -------------------------
    const now = new Date();

    const startOfDay = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    

    // =========================
    // 1️⃣ VACCINES DUE TODAY
    // =========================
    const vaccineDueToday = await Animal.countDocuments({
      user: userId,
      "vaccineInfo.nextVaccineDate": {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      "vaccineInfo.vaccineStatus": "pending",
    });

    // =========================
    // 2️⃣ DEWORMING DUE TODAY
    // =========================
    const dewormingDueToday = await Animal.countDocuments({
      user: userId,
      "dewormingInfo.nextDewormingDate": {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      "dewormingInfo.dewormingStatus": "pending",
    });

    const totalDueToday = vaccineDueToday + dewormingDueToday;

    // =========================
    // 3️⃣ REMINDERS SENT TODAY
    // =========================
    const vaccineSentToday = await ReminderLog.countDocuments({
      user: userId,
      type: "vaccine",
      sentAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const dewormingSentToday = await ReminderLog.countDocuments({
      user: userId,
      type: "deworming",
      sentAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalSentToday = vaccineSentToday + dewormingSentToday;

    // =========================
    // 4️⃣ COMPLETED TODAY
    // =========================
    const animals = await Animal.find({ user: userId });

    let vaccineCompletedToday = 0;
    let dewormingCompletedToday = 0;

    animals.forEach((animal) => {
      animal.vaccineHistory.forEach((entry) => {
        if (
          entry.status === "completed" &&
          entry.date >= startOfDay &&
          entry.date <= endOfDay
        ) {
          vaccineCompletedToday++;
        }
      });

      animal.dewormingHistory.forEach((entry) => {
        if (
          entry.status === "completed" &&
          entry.date >= startOfDay &&
          entry.date <= endOfDay
        ) {
          dewormingCompletedToday++;
        }
      });
    });

    const totalCompletedToday =
      vaccineCompletedToday + dewormingCompletedToday;

    // =========================
    // 5️⃣ CONVERSION RATE
    // =========================
    const conversionRate =
      totalSentToday > 0
        ? ((totalCompletedToday / totalSentToday) * 100).toFixed(1)
        : 0;

    // =========================
    // ✅ RESPONSE
    // =========================
    res.json({
      vaccineCount: vaccineSentToday,
      dewormingCount: dewormingSentToday,
      totalSent: totalSentToday,
    
      thankyouCount: await ReminderLog.countDocuments({
        user: userId,
        reminderWindow: "thankyou",
        sentAt: { $gte: startOfDay, $lte: endOfDay },
      }),
    
      missedCount: await ReminderLog.countDocuments({
        user: userId,
        reminderWindow: "missed",
        sentAt: { $gte: startOfDay, $lte: endOfDay },
      }),
    
      vaccineCompleted: vaccineCompletedToday,
      dewormingCompleted: dewormingCompletedToday,
    
      conversionRate,
    });
    
  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

module.exports = router;
