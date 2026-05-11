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
  activityType: "vaccine",
  messageType: "reminder",
  stage: row.stage,
  vaccineName: row.vaccine_name,
  dueDate: row.due_date.toISOString().split("T")[0],
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
  activityType: "deworming",
  messageType: "reminder",
  dewormingName: row.deworming_name,
  dueDate: row.due_date.toISOString().split("T")[0],
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
      missed.push({
  type: "vaccine",
  activityType: "vaccine",
  messageType: "missed", // 👈 IMPORTANT
  stage: row.stage,
  vaccineName: row.vaccine_name,
  dueDate: row.due_date.toISOString().split("T")[0] || "",
  animalId: row.animal_id,
  animalName: row.animal_name,
  ownerName: row.owner_name,
  ownerPhone: row.phone,
});
      }
    });

    res.json(missed);

  } catch (err) {
    res.status(500).json({ message: "Failed" });
  }
});

// ---------------------
// SPECIAL MESSAGES
// ---------------------
router.get("/special", protect, async (req, res) => {
  try {
    const today = normalize(new Date());

    const special = [];

    // 🎂 Birthday messages
    const birthdayRes = await pool.query(
      `SELECT a.*, 
              o.name AS owner_name,
              o.phone AS owner_phone
       FROM animals a
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1
         AND a.dob IS NOT NULL`,
      [req.user.id]
    );

    birthdayRes.rows.forEach((row) => {
      const dob = new Date(row.dob);

      if (
        dob.getDate() === today.getDate() &&
        dob.getMonth() === today.getMonth()
      ) {
        special.push({
          type: "birthday",
          activityType: "birthday",
          messageType: "special",
          animalId: row.id,
          animalName: row.name,
          species: row.species,
          ownerName: row.owner_name,
          ownerPhone: row.owner_phone,
          dueDate: today.toISOString().split("T")[0],
        });
      }
    });

    // 🆕 New Owner Messages
    const newOwnerRes = await pool.query(
      `SELECT o.*, a.id AS animal_id, a.name AS animal_name, a.species
       FROM owners o
       JOIN animals a ON a.owner_id = o.id
       WHERE a.user_id = $1
         AND o.created_at >= NOW() - INTERVAL '3 days'`,
      [req.user.id]
    );

    newOwnerRes.rows.forEach((row) => {
      special.push({
        type: "new_owner",
        activityType: "welcome",
        messageType: "special",
        animalId: row.animal_id,
        animalName: row.animal_name,
        species: row.species,
        ownerName: row.name,
        ownerPhone: row.phone,
        dueDate: today.toISOString().split("T")[0],
      });
    });

    res.json(special);

  } catch (err) {
    console.error("SPECIAL ERROR:", err);
    res.status(500).json({ message: "Failed to fetch special messages" });
  }
});


// ---------------------
// THANK YOU MESSAGES
// ---------------------
router.get("/thank-you", protect, async (req, res) => {
  try {
    const thankYou = [];

    // Recently completed vaccines
    const vaccineRes = await pool.query(
      `SELECT vs.*, 
              a.name AS animal_name,
              a.species,
              o.name AS owner_name,
              o.phone AS owner_phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1
         AND vs.status = 'completed'
         AND vs.updated_at >= NOW() - INTERVAL '2 days'`,
      [req.user.id]
    );

    vaccineRes.rows.forEach((row) => {
      thankYou.push({
        type: "thankyou",
        activityType: "vaccination",
        messageType: "thankyou",
        animalId: row.animal_id,
        animalName: row.animal_name,
        species: row.species,
        ownerName: row.owner_name,
        ownerPhone: row.owner_phone,
        dueDate: row.updated_at
          ? new Date(row.updated_at).toISOString().split("T")[0]
          : "",
      });
    });

    // Recently completed deworming
    const dewormRes = await pool.query(
      `SELECT ds.*, 
              a.name AS animal_name,
              a.species,
              o.name AS owner_name,
              o.phone AS owner_phone
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1
         AND ds.status = 'completed'
         AND ds.updated_at >= NOW() - INTERVAL '2 days'`,
      [req.user.id]
    );

    dewormRes.rows.forEach((row) => {
      thankYou.push({
        type: "thankyou",
        activityType: "deworming",
        messageType: "thankyou",
        animalId: row.animal_id,
        animalName: row.animal_name,
        species: row.species,
        ownerName: row.owner_name,
        ownerPhone: row.owner_phone,
        dueDate: row.updated_at
          ? new Date(row.updated_at).toISOString().split("T")[0]
          : "",
      });
    });

    res.json(thankYou);

  } catch (err) {
    console.error("THANK YOU ERROR:", err);
    res.status(500).json({ message: "Failed to fetch thank you messages" });
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