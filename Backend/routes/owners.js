const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { protect } = require("../middleware/auth");

// ---------------------
// CREATE OWNER
// ---------------------
router.post("/", protect, async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone required" });
    }

    // 🔍 Check if owner exists
    const existing = await pool.query(
      "SELECT * FROM owners WHERE phone = $1 AND user_id = $2",
      [phone, req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    // ➕ Create owner
    const result = await pool.query(
      `INSERT INTO owners (name, phone, email, address, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, phone, email, address, req.user.id]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("CREATE OWNER ERROR:", err);
    res.status(500).json({ message: "Failed to create owner" });
  }
});


// ---------------------
// GET ALL OWNERS
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM owners WHERE user_id = $1",
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("FETCH OWNERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch owners" });
  }
});


// ---------------------
// GET OWNER + ANIMALS
// ---------------------
router.get("/:id", protect, async (req, res) => {
  try {
    const ownerId = req.params.id;

    // 🔍 Get owner
    const ownerRes = await pool.query(
      "SELECT * FROM owners WHERE id = $1 AND user_id = $2",
      [ownerId, req.user.id]
    );

    const owner = ownerRes.rows[0];

    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    // 🔍 Get animals
    const animalRes = await pool.query(
      "SELECT * FROM animals WHERE owner_id = $1 AND user_id = $2",
      [ownerId, req.user.id]
    );

    res.json({
      ...owner,
      animals: animalRes.rows,
    });

  } catch (err) {
    console.error("FETCH OWNER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});


// ---------------------
// GET OWNER REPORT
// ---------------------
router.get("/:ownerId/reports", protect, async (req, res) => {
  try {
    const { ownerId } = req.params;

    // 🔍 Get animals
    const animalsRes = await pool.query(
      "SELECT id FROM animals WHERE owner_id = $1 AND user_id = $2",
      [ownerId, req.user.id]
    );

    const animalIds = animalsRes.rows.map(a => a.id);

    let notificationsReceived = 0;
    let notificationsMissed = 0;
    let clinicVisits = 0;

    // 🔍 Vaccine history
    const vaccineRes = await pool.query(
      "SELECT status FROM vaccine_history WHERE animal_id = ANY($1)",
      [animalIds]
    );

    vaccineRes.rows.forEach(v => {
      if (v.status === "completed") notificationsReceived++;
      if (v.status === "missed") notificationsMissed++;
    });

    // 🔍 Deworming history
    const dewormRes = await pool.query(
      "SELECT status FROM deworming_history WHERE animal_id = ANY($1)",
      [animalIds]
    );

    dewormRes.rows.forEach(d => {
      if (d.status === "completed") notificationsReceived++;
      if (d.status === "missed") notificationsMissed++;
    });

    // 🔍 Visits (thank you flags from animals table)
    const visitRes = await pool.query(
      `SELECT vaccine_thank_you_sent, deworming_thank_you_sent
       FROM animals WHERE owner_id = $1 AND user_id = $2`,
      [ownerId, req.user.id]
    );

    visitRes.rows.forEach(a => {
      if (a.vaccine_thank_you_sent) clinicVisits++;
      if (a.deworming_thank_you_sent) clinicVisits++;
    });

    res.json({ notificationsReceived, notificationsMissed, clinicVisits });

  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
});

module.exports = router;