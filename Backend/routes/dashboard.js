const express = require("express");
const router = express.Router();
const Animal = require("../models/Pet");
const { protect } = require("../middleware/auth");

const IST_OFFSET_MINUTES = 330;

const getISTDate = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + IST_OFFSET_MINUTES);
  return d;
};

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
    const animals = await Animal.find({ user: req.user.id }).populate(
      "ownerId", "name phone"
    );

    let vaccinePending     = 0;
    let vaccineCompleted   = 0;
    let dewormingPending   = 0;
    let dewormingCompleted = 0;

    const today          = normalize(getISTDate());
    const todayVaccine   = [];
    const todayDeworming = [];

    animals.forEach((animal) => {

      // 💉 VACCINE SCHEDULE
      (animal.vaccineSchedule || []).forEach((row) => {
        if (!row.vaccineName) return; // skip rows with no name

        if (row.status === "completed") {
          vaccineCompleted++;
        } else if (row.status === "pending") {
          vaccinePending++;

          if (row.dueDate) {
            const dueDate = normalize(row.dueDate);
            if (dueDate.getTime() === today.getTime()) {
              todayVaccine.push({
                animalId:    animal._id,
                animalName:  animal.name,
                species:     animal.species,
                ownerName:   animal.ownerId?.name  || "Pet Owner",
                ownerPhone:  animal.ownerId?.phone || "",
                stage:       row.stage,
                vaccineName: row.vaccineName,
                dueDate:     row.dueDate,
              });
            }
          }
        }
      });

      // 🪱 DEWORMING SCHEDULE
      (animal.dewormingSchedule || []).forEach((row) => {
        if (!row.dewormingName) return; // skip rows with no name

        if (row.status === "completed") {
          dewormingCompleted++;
        } else if (row.status === "pending") {
          dewormingPending++;

          if (row.dueDate) {
            const dueDate = normalize(row.dueDate);
            if (dueDate.getTime() === today.getTime()) {
              todayDeworming.push({
                animalId:      animal._id,
                animalName:    animal.name,
                species:       animal.species,
                ownerName:     animal.ownerId?.name  || "Pet Owner",
                ownerPhone:    animal.ownerId?.phone || "",
                dewormingName: row.dewormingName,
                dueDate:       row.dueDate,
              });
            }
          }
        }
      });
    });

    res.json({
      vaccine: {
        pending:   vaccinePending,
        completed: vaccineCompleted,
      },
      deworming: {
        pending:   dewormingPending,
        completed: dewormingCompleted,
      },
      today: {
        vaccine:   todayVaccine,
        deworming: todayDeworming,
        total:     todayVaccine.length + todayDeworming.length,
      },
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;