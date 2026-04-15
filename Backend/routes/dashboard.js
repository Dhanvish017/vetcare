const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { protect } = require("../middleware/auth");

// ---------------------
// HELPERS
// ---------------------
const normalize = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------------------
// DASHBOARD: TOTAL STATS
// ---------------------
router.get("/stats", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const today = normalize(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // =========================
    // 💉 VACCINE COUNTS
    // =========================
    const vaccineCounts = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       WHERE a.user_id = $1`,
      [userId]
    );

    // =========================
    // 🪱 DEWORMING COUNTS
    // =========================
    const dewormingCounts = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       WHERE a.user_id = $1`,
      [userId]
    );

    // =========================
    // TODAY VACCINE
    // =========================
    const todayVaccine = await pool.query(
      `SELECT 
        vs.*, 
        a.name AS animal_name,
        a.species,
        o.name AS owner_name,
        o.phone AS owner_phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1
       AND vs.status = 'pending'
       AND vs.due_date >= $2 AND vs.due_date < $3`,
      [userId, today, tomorrow]
    );

    // =========================
    // TODAY DEWORMING
    // =========================
    const todayDeworming = await pool.query(
      `SELECT 
        ds.*, 
        a.name AS animal_name,
        a.species,
        o.name AS owner_name,
        o.phone AS owner_phone
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1
       AND ds.status = 'pending'
       AND ds.due_date >= $2 AND ds.due_date < $3`,
      [userId, today, tomorrow]
    );

    res.json({
      vaccine: {
        pending:   parseInt(vaccineCounts.rows[0].pending),
        completed: parseInt(vaccineCounts.rows[0].completed),
      },
      deworming: {
        pending:   parseInt(dewormingCounts.rows[0].pending),
        completed: parseInt(dewormingCounts.rows[0].completed),
      },
      today: {
        vaccine:   todayVaccine.rows,
        deworming: todayDeworming.rows,
        total:     todayVaccine.rows.length + todayDeworming.rows.length,
      },
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;