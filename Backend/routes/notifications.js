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
// GET NOTIFICATIONS
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const today = normalize(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const seventhDay = new Date(today);
    seventhDay.setDate(today.getDate() + 7);

    const notifications = { today: [], tomorrow: [], seventhDay: [] };

    // 🔍 Vaccine schedule
    const vaccineRes = await pool.query(
      `SELECT vs.*, a.name AS animal_name, a.species,
              o.name AS owner_name, o.phone AS owner_phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1 AND vs.status = 'pending'`,
      [req.user.id]
    );

    vaccineRes.rows.forEach((row) => {
      if (!row.due_date) return;

      const dueDate = normalize(row.due_date);

      const payload = {
        type: "vaccine",
        stage: row.stage,
        vaccineName: row.vaccine_name,
        dueDate,
        animalId: row.animal_id,
        animalName: row.animal_name,
        species: row.species,
        ownerName: row.owner_name,
        ownerPhone: row.owner_phone,
      };

      if (dueDate.getTime() === today.getTime()) notifications.today.push(payload);
      if (dueDate.getTime() === tomorrow.getTime()) notifications.tomorrow.push(payload);
      if (dueDate.getTime() === seventhDay.getTime()) notifications.seventhDay.push(payload);
    });

    // 🔍 Deworming schedule
    const dewormRes = await pool.query(
      `SELECT ds.*, a.name AS animal_name, a.species,
              o.name AS owner_name, o.phone AS owner_phone
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1 AND ds.status = 'pending'`,
      [req.user.id]
    );

    dewormRes.rows.forEach((row) => {
      if (!row.due_date) return;

      const dueDate = normalize(row.due_date);

      const payload = {
        type: "deworming",
        dewormingName: row.deworming_name,
        dueDate,
        animalId: row.animal_id,
        animalName: row.animal_name,
        species: row.species,
        ownerName: row.owner_name,
        ownerPhone: row.owner_phone,
      };

      if (dueDate.getTime() === today.getTime()) notifications.today.push(payload);
      if (dueDate.getTime() === tomorrow.getTime()) notifications.tomorrow.push(payload);
      if (dueDate.getTime() === seventhDay.getTime()) notifications.seventhDay.push(payload);
    });

    res.json(notifications);

  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});


// ---------------------
// MISSED
// ---------------------
router.get("/missed", protect, async (req, res) => {
  try {
    const today = normalize(new Date());
    const missed = [];

    const resData = await pool.query(
      `SELECT vs.*, a.name AS animal_name, o.name AS owner_name, o.phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1 AND vs.status = 'pending'`,
      [req.user.id]
    );

    resData.rows.forEach(row => {
      if (!row.due_date) return;

      const dueDate = new Date(row.due_date);
      const thirdDay = new Date(dueDate);
      thirdDay.setDate(thirdDay.getDate() + 3);

      if (today >= normalize(thirdDay)) {
        missed.push(row);
      }
    });

    res.json(missed);

  } catch (err) {
    res.status(500).json({ message: "Failed" });
  }
});


// ---------------------
// SEND WHATSAPP (LOG)
// ---------------------
router.post("/send-whatsapp/:animalId", protect, async (req, res) => {
  try {
    const { type } = req.body;

    const result = await pool.query(
      `INSERT INTO reminder_logs 
       (user_id, animal_id, owner_id, type, reminder_window)
       VALUES ($1,$2,$3,$4,'today')`,
      [req.user.id, req.params.animalId, req.body.ownerId, type]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed" });
  }
});


module.exports = router;