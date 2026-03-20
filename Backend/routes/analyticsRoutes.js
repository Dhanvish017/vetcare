const express = require("express");
const router = express.Router();
const Animal = require("../models/Pet");
const ReminderLog = require("../models/ReminderLog");
const { protect } = require("../middleware/auth");

router.get("/today", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // -------------------------
    // TODAY RANGE (IST)
    // -------------------------
    const now = new Date();
    const startOfDay = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    // =========================
    // 1️⃣ REMINDERS SENT TODAY (from ReminderLog)
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

    // =========================
    // 2️⃣ VISITED TODAY
    // Count schedule rows whose status is "completed"
    // and whose dueDate is today (meaning they were due today and completed)
    // =========================
    const animals = await Animal.find({ user: userId });

    let vaccineVisitedToday  = 0;
    let dewormingVisitedToday = 0;

    animals.forEach((animal) => {
      // 💉 Vaccine schedule rows completed today
      (animal.vaccineSchedule || []).forEach((row) => {
        if (row.status === "completed" && row.dueDate) {
          const due = new Date(row.dueDate);
          if (due >= startOfDay && due <= endOfDay) {
            vaccineVisitedToday++;
          }
        }
      });

      // 🪱 Deworming schedule rows completed today
      (animal.dewormingSchedule || []).forEach((row) => {
        if (row.status === "completed" && row.dueDate) {
          const due = new Date(row.dueDate);
          if (due >= startOfDay && due <= endOfDay) {
            dewormingVisitedToday++;
          }
        }
      });
    });

    // =========================
    // 3️⃣ THANK YOU + MISSED COUNT (from ReminderLog)
    // =========================
    const thankyouCount = await ReminderLog.countDocuments({
      user: userId,
      reminderWindow: "thankyou",
      sentAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const missedCount = await ReminderLog.countDocuments({
      user: userId,
      reminderWindow: "missed",
      sentAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // =========================
    // 4️⃣ CONVERSION RATE
    // (visited / sent) * 100
    // =========================
    const totalSent    = vaccineSentToday + dewormingSentToday;
    const totalVisited = vaccineVisitedToday + dewormingVisitedToday;

    const conversionRate =
      totalSent > 0
        ? ((totalVisited / totalSent) * 100).toFixed(1)
        : "0.0";

    res.json({
      vaccineCount:        vaccineSentToday,
      dewormingCount:      dewormingSentToday,
      totalSent,
      vaccineVisited:      vaccineVisitedToday,
      dewormingVisited:    dewormingVisitedToday,
      totalVisited,
      thankyouCount,
      missedCount,
      conversionRate,
    });

  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

module.exports = router;