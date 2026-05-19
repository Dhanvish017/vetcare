const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { protect } = require("../middleware/auth");

// ---------------------
// ADD ANIMAL
// ---------------------
router.post("/", protect, async (req, res) => {
  try {
    const { owner_id, name, species, breed, age, gender, dob } = req.body;

    if (!owner_id || !name || !species) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO animals 
       (user_id, owner_id, name, species, breed, age, gender,dob)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.user.id,
        owner_id,
        name,
        species.toLowerCase(),
        breed               || null,
        parseInt(age) || null,      // age is INTEGER — parse it
        gender              || null,
        dob                 || null, // dob is timestamp — send ISO string or null
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("ADD ANIMAL ERROR:", err);
    res.status(500).json({ message: "Failed to add animal" });
  }
});


// ---------------------
// GET ALL ANIMALS
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM animals WHERE user_id = $1",
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("FETCH ANIMALS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch animals" });
  }
});


// ---------------------
// GET ANIMAL BY ID
// ---------------------
router.get("/:id", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM animals WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    const animal = result.rows[0];

    if (!animal) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(animal);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch animal" });
  }
});


// ---------------------
// SAVE SCHEDULE
// ---------------------
router.put("/:animalId/schedule", protect, async (req, res) => {
  try {
    const { vaccineSchedule, dewormingSchedule } = req.body;
    const animalId = req.params.animalId;

    // Delete old schedule
    await pool.query(
      "DELETE FROM vaccine_schedule WHERE animal_id = $1",
      [animalId]
    );

    await pool.query(
      "DELETE FROM deworming_schedule WHERE animal_id = $1",
      [animalId]
    );

    // Insert new vaccine schedule
    if (vaccineSchedule) {
      for (let row of vaccineSchedule) {
        await pool.query(
          `INSERT INTO vaccine_schedule 
           (animal_id, stage, vaccine_name, interval, due_date, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            animalId,
            row.stage,
            row.vaccineName,
            row.interval,
            row.dueDate,
            row.status || "pending",
            row.notes,
          ]
        );
      }
    }

    // Insert deworming schedule
    if (dewormingSchedule) {
      for (let row of dewormingSchedule) {
        await pool.query(
          `INSERT INTO deworming_schedule
           (animal_id, deworming_name, interval, due_date, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            animalId,
            row.dewormingName,
            row.interval,
            row.dueDate,
            row.status || "pending",
            row.notes,
          ]
        );
      }
    }

    res.json({ success: true });

  } catch (err) {
    console.error("SAVE SCHEDULE ERROR:", err);
    res.status(500).json({ message: "Failed to save schedule" });
  }
});


// ---------------------
// ADD ACTIVITIES
// ---------------------
router.put("/:animalId/activities", protect, async (req, res) => {
  try {
    const animalId = req.params.animalId;

    // Vaccine history
    if (req.body.vaccineInfo) {
      await pool.query(
        `INSERT INTO vaccine_history (animal_id, vaccine_type, stage, status, date)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          animalId,
          req.body.vaccineInfo.vaccineType,
          req.body.vaccineInfo.stage,
          "completed",
          req.body.vaccineInfo.lastVaccineDate,
        ]
      );
    }

    // Deworming history
    if (req.body.dewormingInfo) {
      await pool.query(
        `INSERT INTO deworming_history (animal_id, deworming_name, status, date)
         VALUES ($1,$2,$3,$4)`,
        [
          animalId,
          req.body.dewormingInfo.dewormingName,
          "completed",
          req.body.dewormingInfo.lastDewormingDate,
        ]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("ACTIVITY ERROR:", err);
    res.status(500).json({ message: "Failed to add activity" });
  }
});


// ---------------------
// DELETE ANIMAL
// ---------------------
router.delete("/:id", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM animals WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Animal not found" });
    }

    res.json({ message: "Animal deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;