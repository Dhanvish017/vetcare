const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const { protect } = require("../middleware/auth");

// ---------------------
// GET TEMPLATE
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const [dogVaccines, dogDeworming, catVaccines, catDeworming] = await Promise.all([
      pool.query('SELECT stage, "interval", vaccine_name   FROM dog_vaccines  WHERE user_id = $1 ORDER BY id', [userId]),
      pool.query('SELECT "interval", deworming_name        FROM dog_deworming WHERE user_id = $1 ORDER BY id', [userId]),
      pool.query('SELECT stage, "interval", vaccine_name   FROM cat_vaccines  WHERE user_id = $1 ORDER BY id', [userId]),
      pool.query('SELECT "interval", deworming_name        FROM cat_deworming WHERE user_id = $1 ORDER BY id', [userId]),
    ]);

    res.json({
      scheduleTemplate: {
        dog: {
          vaccine:   dogVaccines.rows.map(r  => ({ stage: r.stage,  interval: r.interval, vaccineName:   r.vaccine_name   })),
          deworming: dogDeworming.rows.map(r => ({                   interval: r.interval, dewormingName: r.deworming_name })),
        },
        cat: {
          vaccine:   catVaccines.rows.map(r  => ({ stage: r.stage,  interval: r.interval, vaccineName:   r.vaccine_name   })),
          deworming: catDeworming.rows.map(r => ({                   interval: r.interval, dewormingName: r.deworming_name })),
        },
      },
    });

  } catch (err) {
    console.error("GET TEMPLATE ERROR:", err.message);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// ---------------------
// SAVE TEMPLATE
// ---------------------
router.put("/", protect, async (req, res) => {
  try {
    const { scheduleTemplate } = req.body;
    const userId = req.user.id;

    // Clear old data for this user
    await Promise.all([
      pool.query("DELETE FROM dog_vaccines  WHERE user_id = $1", [userId]),
      pool.query("DELETE FROM dog_deworming WHERE user_id = $1", [userId]),
      pool.query("DELETE FROM cat_vaccines  WHERE user_id = $1", [userId]),
      pool.query("DELETE FROM cat_deworming WHERE user_id = $1", [userId]),
    ]);

    // Dog vaccines
    for (const row of scheduleTemplate.dog?.vaccine || []) {
      await pool.query(
        `INSERT INTO dog_vaccines (user_id, stage, "interval", vaccine_name)
         VALUES ($1, $2, $3, $4)`,
        [userId, row.stage || null, row.interval || 0, row.vaccineName || null]
      );
    }

    // Dog deworming
    for (const row of scheduleTemplate.dog?.deworming || []) {
      await pool.query(
        `INSERT INTO dog_deworming (user_id, "interval", deworming_name)
         VALUES ($1, $2, $3)`,
        [userId, row.interval || 0, row.dewormingName || null]
      );
    }

    // Cat vaccines
    for (const row of scheduleTemplate.cat?.vaccine || []) {
      await pool.query(
        `INSERT INTO cat_vaccines (user_id, stage, "interval", vaccine_name)
         VALUES ($1, $2, $3, $4)`,
        [userId, row.stage || null, row.interval || 0, row.vaccineName || null]
      );
    }

    // Cat deworming
    for (const row of scheduleTemplate.cat?.deworming || []) {
      await pool.query(
        `INSERT INTO cat_deworming (user_id, "interval", deworming_name)
         VALUES ($1, $2, $3)`,
        [userId, row.interval || 0, row.dewormingName || null]
      );
    }

    res.json({ success: true, message: "Template saved" });

  } catch (err) {
    console.error("SAVE TEMPLATE ERROR:", err.message);
    res.status(500).json({ message: "Failed to save template" });
  }
});

module.exports = router;