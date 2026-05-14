const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const { protect } = require("../middleware/auth");

// =============================================
// GET /api/animal-schedule/:animalId
// Fetch vaccine + deworming schedule for one animal
// =============================================
router.get("/:animalId", protect, async (req, res) => {
  try {
    const animalId = req.params.animalId;
    const userId   = req.user.id;

    // Verify animal belongs to this user
    const animalResult = await pool.query(
      `SELECT * FROM animals WHERE id = $1 AND user_id = $2`,
      [animalId, userId]
    );

    if (animalResult.rows.length === 0) {
      return res.status(404).json({ message: "Animal not found" });
    }

    // Vaccine schedule
    const vaccineResult = await pool.query(
      `SELECT id, stage, "interval", vaccine_name, due_date, status
       FROM vaccine_schedule
       WHERE animal_id = $1
       ORDER BY due_date ASC NULLS LAST`,
      [animalId]
    );

    // Deworming schedule
    const dewormingResult = await pool.query(
      `SELECT id, "interval", deworming_name, due_date, status
       FROM deworming_schedule
       WHERE animal_id = $1
       ORDER BY due_date ASC NULLS LAST`,
      [animalId]
    );

    res.json({
      vaccineSchedule: vaccineResult.rows.map((r) => ({
        id:          r.id,
        stage:       r.stage,
        interval:    r.interval,
        vaccineName: r.vaccine_name,
        dueDate:     r.due_date,
        status:      r.status || "pending",
      })),
      dewormingSchedule: dewormingResult.rows.map((r) => ({
        id:            r.id,
        interval:      r.interval,
        dewormingName: r.deworming_name,
        dueDate:       r.due_date,
        status:        r.status || "pending",
      })),
    });

  } catch (err) {
    console.error("FETCH SCHEDULE ERROR:", err.message);
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
});

// =============================================
// PUT /api/animal-schedule/:animalId
// Update vaccine + deworming schedule
// Rows with id → UPDATE, rows without id → INSERT
// =============================================
router.put("/:animalId", protect, async (req, res) => {
  try {
    const animalId = req.params.animalId;
    const { vaccineSchedule = [], dewormingSchedule = [] } = req.body;

    // ---------------------
    // VACCINE
    // ---------------------
    for (const row of vaccineSchedule) {
      if (row.id) {
        // Existing row → UPDATE
        await pool.query(
          `UPDATE vaccine_schedule
           SET vaccine_name = $1,
               due_date     = $2,
               status       = $3
           WHERE id = $4`,
          [row.vaccineName || null, row.dueDate || null, row.status || "pending", row.id]
        );
      } else {
        // New row → INSERT
        await pool.query(
          `INSERT INTO vaccine_schedule (animal_id, stage, "interval", vaccine_name, due_date, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [animalId, row.stage || null, row.interval || 0, row.vaccineName || null, row.dueDate || null, row.status || "pending"]
        );
      }
    }

    // ---------------------
    // DEWORMING
    // ---------------------
    for (const row of dewormingSchedule) {
      if (row.id) {
        // Existing row → UPDATE
        await pool.query(
          `UPDATE deworming_schedule
           SET deworming_name = $1,
               due_date       = $2,
               status         = $3
           WHERE id = $4`,
          [row.dewormingName || null, row.dueDate || null, row.status || "pending", row.id]
        );
      } else {
        // New row → INSERT
        await pool.query(
          `INSERT INTO deworming_schedule (animal_id, "interval", deworming_name, due_date, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [animalId, row.interval || 0, row.dewormingName || null, row.dueDate || null, row.status || "pending"]
        );
      }
    }

    res.json({ success: true });

  } catch (err) {
    console.error("UPDATE SCHEDULE ERROR:", err.message);
    res.status(500).json({ message: "Failed to update schedule" });
  }
});

// =============================================
// DELETE /api/animal-schedule/:animalId
// Delete animal + all its schedules
// =============================================
router.delete("/:animalId", protect, async (req, res) => {
  try {
    const animalId = req.params.animalId;
    const userId   = req.user.id;

    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM animals WHERE id = $1 AND user_id = $2`,
      [animalId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Animal not found" });
    }

    // Delete schedules first (foreign key), then animal
    await pool.query(`DELETE FROM vaccine_schedule   WHERE animal_id = $1`, [animalId]);
    await pool.query(`DELETE FROM deworming_schedule WHERE animal_id = $1`, [animalId]);
    await pool.query(`DELETE FROM animals            WHERE id = $1`,        [animalId]);

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE ANIMAL ERROR:", err.message);
    res.status(500).json({ message: "Failed to delete animal" });
  }
});

module.exports = router;