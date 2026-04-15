const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { protect } = require("../middleware/auth");

// ---------------------
// GET TEMPLATE
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const dogVaccines = await pool.query(
      "SELECT * FROM dog_vaccines WHERE user_id = $1",
      [userId]
    );

    const dogDeworming = await pool.query(
      "SELECT * FROM dog_deworming WHERE user_id = $1",
      [userId]
    );

    const catVaccines = await pool.query(
      "SELECT * FROM cat_vaccines WHERE user_id = $1",
      [userId]
    );

    const catDeworming = await pool.query(
      "SELECT * FROM cat_deworming WHERE user_id = $1",
      [userId]
    );

    res.json({
      scheduleTemplate: {
        dog: {
          vaccine: dogVaccines.rows,
          deworming: dogDeworming.rows,
        },
        cat: {
          vaccine: catVaccines.rows,
          deworming: catDeworming.rows,
        },
      },
    });

  } catch (err) {
    console.error("GET TEMPLATE ERROR:", err);
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

    // 🧹 Clear old data
    await pool.query("DELETE FROM dog_vaccines WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM dog_deworming WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM cat_vaccines WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM cat_deworming WHERE user_id = $1", [userId]);

    // 🐶 Dog vaccines
    for (let row of scheduleTemplate.dog?.vaccine || []) {
      await pool.query(
        `INSERT INTO dog_vaccines (user_id, stage, interval, vaccine_name)
         VALUES ($1,$2,$3,$4)`,
        [userId, row.stage, row.interval, row.vaccineName]
      );
    }

    // 🐶 Dog deworming
    for (let row of scheduleTemplate.dog?.deworming || []) {
      await pool.query(
        `INSERT INTO dog_deworming (user_id, interval, deworming_name)
         VALUES ($1,$2,$3)`,
        [userId, row.interval, row.dewormingName]
      );
    }

    // 🐱 Cat vaccines
    for (let row of scheduleTemplate.cat?.vaccine || []) {
      await pool.query(
        `INSERT INTO cat_vaccines (user_id, stage, interval, vaccine_name)
         VALUES ($1,$2,$3,$4)`,
        [userId, row.stage, row.interval, row.vaccineName]
      );
    }

    // 🐱 Cat deworming
    for (let row of scheduleTemplate.cat?.deworming || []) {
      await pool.query(
        `INSERT INTO cat_deworming (user_id, interval, deworming_name)
         VALUES ($1,$2,$3)`,
        [userId, row.interval, row.dewormingName]
      );
    }

    res.json({ success: true, message: "Template saved" });

  } catch (err) {
    console.error("SAVE TEMPLATE ERROR:", err);
    res.status(500).json({ message: "Failed to save template" });
  }
});

module.exports = router;