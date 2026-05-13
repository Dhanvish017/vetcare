const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const { protect } = require("../middleware/auth");

// ---------------------
// HELPER
// ---------------------
const normalize = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// =============================================
// GET /api/notifications
// Today | Tomorrow | 7th Day
// =============================================
router.get("/", protect, async (req, res) => {
  try {
    const today      = normalize(new Date());
    const tomorrow   = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const seventhDay = new Date(today); seventhDay.setDate(today.getDate() + 7);

    const notifications = { today: [], tomorrow: [], seventhDay: [] };

    // 💉 VACCINE
    const vaccineRes = await pool.query(
      `SELECT vs.id, vs.animal_id, vs.stage, vs.vaccine_name, vs.due_date,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND vs.status = 'pending'
         AND vs.vaccine_name IS NOT NULL
         AND vs.vaccine_name != ''`,
      [req.user.id]
    );

    vaccineRes.rows.forEach((row) => {
      if (!row.due_date) return;
      const dueDate = normalize(row.due_date);
      const payload = {
        _id:           `${row.animal_id}-vaccine-${row.id}`,
        type:          "vaccine",
        messageType:   "reminder",
        scheduleRowId: row.id,
        stage:         row.stage,
        vaccineName:   row.vaccine_name,
        dueDate:       row.due_date.toISOString().split("T")[0],
        animalId:      row.animal_id,
        animalName:    row.animal_name,
        species:       row.species,
        ownerId:       row.owner_id,
        ownerName:     row.owner_name,
        ownerPhone:    row.owner_phone,
      };
      if (dueDate.getTime() === today.getTime())      notifications.today.push(payload);
      if (dueDate.getTime() === tomorrow.getTime())   notifications.tomorrow.push(payload);
      if (dueDate.getTime() === seventhDay.getTime()) notifications.seventhDay.push(payload);
    });

    // 🪱 DEWORMING
    const dewormRes = await pool.query(
      `SELECT ds.id, ds.animal_id, ds.deworming_name, ds.due_date,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND ds.status = 'pending'
         AND ds.deworming_name IS NOT NULL
         AND ds.deworming_name != ''`,
      [req.user.id]
    );

    dewormRes.rows.forEach((row) => {
      if (!row.due_date) return;
      const dueDate = normalize(row.due_date);
      const payload = {
        _id:           `${row.animal_id}-deworming-${row.id}`,
        type:          "deworming",
        messageType:   "reminder",
        scheduleRowId: row.id,
        dewormingName: row.deworming_name,
        dueDate:       row.due_date.toISOString().split("T")[0],
        animalId:      row.animal_id,
        animalName:    row.animal_name,
        species:       row.species,
        ownerId:       row.owner_id,
        ownerName:     row.owner_name,
        ownerPhone:    row.owner_phone,
      };
      if (dueDate.getTime() === today.getTime())      notifications.today.push(payload);
      if (dueDate.getTime() === tomorrow.getTime())   notifications.tomorrow.push(payload);
      if (dueDate.getTime() === seventhDay.getTime()) notifications.seventhDay.push(payload);
    });

    res.json(notifications);

  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// =============================================
// GET /api/notifications/missed
// Pending rows 3+ days past due — vaccine + deworming
// =============================================
router.get("/missed", protect, async (req, res) => {
  try {
    const missed = [];

    // 💉 VACCINE MISSED
    const vaccineRes = await pool.query(
      `SELECT vs.id, vs.animal_id, vs.stage, vs.vaccine_name, vs.due_date,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND vs.status = 'pending'
         AND vs.vaccine_name IS NOT NULL
         AND vs.vaccine_name != ''
         AND vs.due_date < NOW() - INTERVAL '3 days'`,
      [req.user.id]
    );

    vaccineRes.rows.forEach((row) => {
      missed.push({
        _id:           `${row.animal_id}-vaccine-${row.id}`,
        type:          "vaccine",
        messageType:   "missed",
        scheduleRowId: row.id,
        stage:         row.stage,
        vaccineName:   row.vaccine_name,
        dueDate:       row.due_date.toISOString().split("T")[0],
        animalId:      row.animal_id,
        animalName:    row.animal_name,
        species:       row.species,
        ownerId:       row.owner_id,
        ownerName:     row.owner_name,
        ownerPhone:    row.owner_phone,
      });
    });

    // 🪱 DEWORMING MISSED
    const dewormRes = await pool.query(
      `SELECT ds.id, ds.animal_id, ds.deworming_name, ds.due_date,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND ds.status = 'pending'
         AND ds.deworming_name IS NOT NULL
         AND ds.deworming_name != ''
         AND ds.due_date < NOW() - INTERVAL '3 days'`,
      [req.user.id]
    );

    dewormRes.rows.forEach((row) => {
      missed.push({
        _id:           `${row.animal_id}-deworming-${row.id}`,
        type:          "deworming",
        messageType:   "missed",
        scheduleRowId: row.id,
        dewormingName: row.deworming_name,
        dueDate:       row.due_date.toISOString().split("T")[0],
        animalId:      row.animal_id,
        animalName:    row.animal_name,
        species:       row.species,
        ownerId:       row.owner_id,
        ownerName:     row.owner_name,
        ownerPhone:    row.owner_phone,
      });
    });

    res.json(missed);

  } catch (err) {
    console.error("MISSED ERROR:", err);
    res.status(500).json({ message: "Failed to fetch missed" });
  }
});

// =============================================
// GET /api/notifications/special
// 1. New owners (created in last 3 days)
// 2. Birthday pets (today)
// 3. Three months check-in (last visit 90+ days ago)
// =============================================
router.get("/special", protect, async (req, res) => {
  try {
    const today = normalize(new Date());
    const special = [];

    // 1️⃣ NEW OWNERS — is_first_time checkbox ticked by doctor
    const newOwnerRes = await pool.query(
      `SELECT o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone,
              a.id AS animal_id, a.name AS animal_name, a.species
       FROM owners o
       JOIN animals a ON a.owner_id = o.id
       WHERE a.user_id = $1
         AND o.new_owner = TRUE`,
      [req.user.id]
    );

    newOwnerRes.rows.forEach((row) => {
      special.push({
        _id:         `new-owner-${row.animal_id}`,
        specialType: "first_time",
        type:        "special",
        messageType: "new_owner",
        animalId:    row.animal_id,
        animalName:  row.animal_name,
        species:     row.species,
        ownerId:     row.owner_id,
        ownerName:   row.owner_name,
        ownerPhone:  row.owner_phone,
        dueDate:     today.toISOString().split("T")[0],
        label:       "🌟 New Owner",
      });
    });

    // 2️⃣ BIRTHDAY — dob month+day matches today
    const birthdayRes = await pool.query(
      `SELECT a.id, a.name, a.species, a.dob,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM animals a
       JOIN owners o ON a.owner_id = o.id
       WHERE a.user_id = $1
         AND a.dob IS NOT NULL
         AND EXTRACT(MONTH FROM a.dob) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY   FROM a.dob) = EXTRACT(DAY   FROM CURRENT_DATE)`,
      [req.user.id]
    );

    birthdayRes.rows.forEach((row) => {
      const age = new Date().getFullYear() - new Date(row.dob).getFullYear();
      special.push({
        _id:         `birthday-${row.id}`,
        specialType: "birthday",
        type:        "special",
        messageType: "birthday",
        animalId:    row.id,
        animalName:  row.name,
        species:     row.species,
        ownerId:     row.owner_id,
        ownerName:   row.owner_name,
        ownerPhone:  row.owner_phone,
        dob:         row.dob,
        age,
        dueDate:     today.toISOString().split("T")[0],
        label:       `🎂 Birthday — ${age} yr${age !== 1 ? "s" : ""} old today!`,
      });
    });

    // 3️⃣ THREE MONTHS — last reminder log was 90+ days ago OR never messaged
    const threeMonthsRes = await pool.query(
      `SELECT DISTINCT ON (a.id)
              a.id AS animal_id, a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone,
              MAX(rl.created_at) AS last_contact
       FROM animals a
       JOIN owners o ON a.owner_id = o.id
       LEFT JOIN reminder_logs rl ON rl.animal_id = a.id AND rl.user_id = $1
       WHERE a.user_id = $1
       GROUP BY a.id, a.name, a.species, o.id, o.name, o.phone
       HAVING MAX(rl.created_at) < NOW() - INTERVAL '90 days'
           OR MAX(rl.created_at) IS NULL`,
      [req.user.id]
    );

    threeMonthsRes.rows.forEach((row) => {
      special.push({
        _id:         `three-months-${row.animal_id}`,
        specialType: "three_months",
        type:        "special",
        messageType: "three_months",
        animalId:    row.animal_id,
        animalName:  row.animal_name,
        species:     row.species,
        ownerId:     row.owner_id,
        ownerName:   row.owner_name,
        ownerPhone:  row.owner_phone,
        dueDate:     today.toISOString().split("T")[0],
        label:       row.last_contact
          ? `📅 Last contact: ${new Date(row.last_contact).toLocaleDateString()}`
          : "📅 Never contacted",
      });
    });

    res.json(special);

  } catch (err) {
    console.error("SPECIAL ERROR:", err);
    res.status(500).json({ message: "Failed to fetch special messages" });
  }
});

// =============================================
// GET /api/notifications/thank-you
// Completed rows due today
// =============================================
router.get("/thank-you", protect, async (req, res) => {
  try {
    const thankYou = [];

    // 💉 VACCINE completed today
    const vaccineRes = await pool.query(
      `SELECT vs.id, vs.animal_id, vs.stage, vs.vaccine_name, vs.due_date,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND vs.status = 'completed'
         AND DATE(vs.due_date) = CURRENT_DATE`,
      [req.user.id]
    );

    vaccineRes.rows.forEach((row) => {
      thankYou.push({
        _id:           `${row.animal_id}-vaccine-${row.id}`,
        type:          "vaccine",
        messageType:   "thankyou",
        scheduleRowId: row.id,
        stage:         row.stage,
        vaccineName:   row.vaccine_name,
        dueDate:       row.due_date.toISOString().split("T")[0],
        animalId:      row.animal_id,
        animalName:    row.animal_name,
        species:       row.species,
        ownerId:       row.owner_id,
        ownerName:     row.owner_name,
        ownerPhone:    row.owner_phone,
      });
    });

    // 🪱 DEWORMING completed today
    const dewormRes = await pool.query(
      `SELECT ds.id, ds.animal_id, ds.deworming_name, ds.due_date,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND ds.status = 'completed'
         AND DATE(ds.due_date) = CURRENT_DATE`,
      [req.user.id]
    );

    dewormRes.rows.forEach((row) => {
      thankYou.push({
        _id:           `${row.animal_id}-deworming-${row.id}`,
        type:          "deworming",
        messageType:   "thankyou",
        scheduleRowId: row.id,
        dewormingName: row.deworming_name,
        dueDate:       row.due_date.toISOString().split("T")[0],
        animalId:      row.animal_id,
        animalName:    row.animal_name,
        species:       row.species,
        ownerId:       row.owner_id,
        ownerName:     row.owner_name,
        ownerPhone:    row.owner_phone,
      });
    });

    res.json(thankYou);

  } catch (err) {
    console.error("THANK YOU ERROR:", err);
    res.status(500).json({ message: "Failed to fetch thank you list", error: err.message });
  }
});

// =============================================
// POST /api/notifications/send-whatsapp/:animalId
// Log reminder sent (today/notification tab)
// =============================================
router.post("/send-whatsapp/:animalId", protect, async (req, res) => {
  try {
    const { type, ownerId } = req.body;
    await pool.query(
      `INSERT INTO reminder_logs (user_id, animal_id, owner_id, type, reminder_window)
       VALUES ($1, $2, $3, $4, 'today')`,
      [req.user.id, req.params.animalId, ownerId || null, type]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("SEND WHATSAPP ERROR:", err);
    res.status(500).json({ message: "Failed to log reminder" });
  }
});

// =============================================
// POST /api/notifications/send-followup/:animalId
// Log missed follow-up sent
// =============================================
router.post("/send-followup/:animalId", protect, async (req, res) => {
  try {
    const { type, ownerId } = req.body;
    await pool.query(
      `INSERT INTO reminder_logs (user_id, animal_id, owner_id, type, reminder_window)
       VALUES ($1, $2, $3, $4, 'missed')`,
      [req.user.id, req.params.animalId, ownerId || null, type]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("SEND FOLLOWUP ERROR:", err);
    res.status(500).json({ message: "Failed to log followup" });
  }
});

// =============================================
// POST /api/notifications/send-special/:animalId
// Log special message sent
// =============================================
router.post("/send-special/:animalId", protect, async (req, res) => {
  try {
    const { type, ownerId, specialType } = req.body;

    await pool.query(
      `INSERT INTO reminder_logs (user_id, animal_id, owner_id, type, reminder_window)
       VALUES ($1, $2, $3, $4, 'special')`,
      [req.user.id, req.params.animalId, ownerId || null, specialType || "special"]
    );

    // After sending new owner message, unset is_first_time flag
    if (specialType === "first_time" && ownerId) {
      await pool.query(
        `UPDATE owners SET new_owner = FALSE WHERE id = $1 AND user_id = $2`,
        [ownerId, req.user.id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("SEND SPECIAL ERROR:", err);
    res.status(500).json({ message: "Failed to log special message" });
  }
});

module.exports = router;