const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const { protect } = require("../middleware/auth");

const normalize = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

router.get("/stats", protect, async (req, res) => {
  try {
    const userId   = req.user.id;
    const today    = normalize(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // TODAY vaccine counts
    const todayVaccineCounts = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE vs.status = 'pending')   AS pending,
         COUNT(*) FILTER (WHERE vs.status = 'completed') AS completed
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       WHERE a.user_id = $1
         AND vs.vaccine_name IS NOT NULL AND vs.vaccine_name != ''
         AND vs.due_date >= $2 AND vs.due_date < $3`,
      [userId, today, tomorrow]
    );

    // TODAY deworming counts
    const todayDewormingCounts = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ds.status = 'pending')   AS pending,
         COUNT(*) FILTER (WHERE ds.status = 'completed') AS completed
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       WHERE a.user_id = $1
         AND ds.deworming_name IS NOT NULL AND ds.deworming_name != ''
         AND ds.due_date >= $2 AND ds.due_date < $3`,
      [userId, today, tomorrow]
    );

    // TODAY vaccine list
    const todayVaccine = await pool.query(
      `SELECT vs.id AS schedule_id, vs.animal_id, vs.stage, vs.vaccine_name, vs.due_date, vs.status,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM vaccine_schedule vs
       JOIN animals a ON vs.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND vs.vaccine_name IS NOT NULL AND vs.vaccine_name != ''
         AND vs.due_date >= $2 AND vs.due_date < $3
       ORDER BY vs.status ASC`,
      [userId, today, tomorrow]
    );

    // TODAY deworming list
    const todayDeworming = await pool.query(
      `SELECT ds.id AS schedule_id, ds.animal_id, ds.deworming_name, ds.due_date, ds.status,
              a.name AS animal_name, a.species,
              o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM deworming_schedule ds
       JOIN animals a ON ds.animal_id = a.id
       JOIN owners  o ON a.owner_id   = o.id
       WHERE a.user_id = $1
         AND ds.deworming_name IS NOT NULL AND ds.deworming_name != ''
         AND ds.due_date >= $2 AND ds.due_date < $3
       ORDER BY ds.status ASC`,
      [userId, today, tomorrow]
    );

    // Visited = completed today (unique animals)
    const allToday = [
      ...todayVaccine.rows.map(r => ({ animalId: r.animal_id, status: r.status })),
      ...todayDeworming.rows.map(r => ({ animalId: r.animal_id, status: r.status })),
    ];

    const uniqueAnimals   = [...new Set(allToday.map(r => r.animal_id || r.animalId))];
    const visitedAnimals  = [...new Set(
      allToday.filter(r => r.status === "completed").map(r => r.animal_id || r.animalId)
    )];
    const totalToday      = uniqueAnimals.length;
    const visitedCount    = visitedAnimals.length;
    const notVisitedCount = totalToday - visitedCount;

    const vPending   = parseInt(todayVaccineCounts.rows[0].pending)   || 0;
    const vCompleted = parseInt(todayVaccineCounts.rows[0].completed) || 0;
    const dPending   = parseInt(todayDewormingCounts.rows[0].pending)   || 0;
    const dCompleted = parseInt(todayDewormingCounts.rows[0].completed) || 0;

    const vaccineList = todayVaccine.rows.map(r => ({
      scheduleId: r.schedule_id, animalId: r.animal_id,
      animalName: r.animal_name, species: r.species,
      stage: r.stage, vaccineName: r.vaccine_name,
      dueDate: r.due_date, status: r.status,
      ownerId: r.owner_id, ownerName: r.owner_name, ownerPhone: r.owner_phone,
      type: "vaccine",
    }));

    const dewormingList = todayDeworming.rows.map(r => ({
      scheduleId: r.schedule_id, animalId: r.animal_id,
      animalName: r.animal_name, species: r.species,
      dewormingName: r.deworming_name,
      dueDate: r.due_date, status: r.status,
      ownerId: r.owner_id, ownerName: r.owner_name, ownerPhone: r.owner_phone,
      type: "deworming",
    }));

    res.json({
      vaccine:   { pending: vPending,   completed: vCompleted },
      deworming: { pending: dPending,   completed: dCompleted },
      visits:    { visited: visitedCount, notVisited: notVisitedCount, total: totalToday },
      today: {
        vaccine:   vaccineList,
        deworming: dewormingList,
        total:     vaccineList.length + dewormingList.length,
      },
    });

  } catch (err) {
    console.error("Dashboard stats error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;