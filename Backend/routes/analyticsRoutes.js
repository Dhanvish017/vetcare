const express = require("express");
const router = express.Router();
const pool = require("../config/db");
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
    // 1️⃣ REMINDERS SENT TODAY
    // =========================
    const vaccineSent = await pool.query(
      `SELECT COUNT(*) FROM reminder_logs
       WHERE user_id = $1 AND type = 'vaccine'
       AND sent_at BETWEEN $2 AND $3`,
      [userId, startOfDay, endOfDay]
    );

    const dewormingSent = await pool.query(
      `SELECT COUNT(*) FROM reminder_logs
       WHERE user_id = $1 AND type = 'deworming'
       AND sent_at BETWEEN $2 AND $3`,
      [userId, startOfDay, endOfDay]
    );

    const vaccineSentToday = parseInt(vaccineSent.rows[0].count);
    const dewormingSentToday = parseInt(dewormingSent.rows[0].count);

    // =========================
    // 2️⃣ VISITED TODAY
    // =========================
    const vaccineVisitedRes = await pool.query(
      `SELECT COUNT(*) FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       WHERE a.user_id = $1
       AND vs.status = 'completed'
       AND vs.due_date BETWEEN $2 AND $3`,
      [userId, startOfDay, endOfDay]
    );

    const dewormingVisitedRes = await pool.query(
      `SELECT COUNT(*) FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       WHERE a.user_id = $1
       AND ds.status = 'completed'
       AND ds.due_date BETWEEN $2 AND $3`,
      [userId, startOfDay, endOfDay]
    );

    const vaccineVisitedToday = parseInt(vaccineVisitedRes.rows[0].count);
    const dewormingVisitedToday = parseInt(dewormingVisitedRes.rows[0].count);

    // =========================
    // 3️⃣ THANK YOU + MISSED
    // =========================
    const thankyouRes = await pool.query(
      `SELECT COUNT(*) FROM reminder_logs
       WHERE user_id = $1
       AND reminder_window = 'thankyou'
       AND sent_at BETWEEN $2 AND $3`,
      [userId, startOfDay, endOfDay]
    );

    const missedRes = await pool.query(
      `SELECT COUNT(*) FROM reminder_logs
       WHERE user_id = $1
       AND reminder_window = 'missed'
       AND sent_at BETWEEN $2 AND $3`,
      [userId, startOfDay, endOfDay]
    );

    const thankyouCount = parseInt(thankyouRes.rows[0].count);
    const missedCount = parseInt(missedRes.rows[0].count);

    // =========================
    // 4️⃣ CONVERSION RATE
    // =========================
    const totalSent = vaccineSentToday + dewormingSentToday;
    const totalVisited = vaccineVisitedToday + dewormingVisitedToday;

    const conversionRate =
      totalSent > 0
        ? ((totalVisited / totalSent) * 100).toFixed(1)
        : "0.0";

    res.json({
      vaccineCount: vaccineSentToday,
      dewormingCount: dewormingSentToday,
      totalSent,
      vaccineVisited: vaccineVisitedToday,
      dewormingVisited: dewormingVisitedToday,
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