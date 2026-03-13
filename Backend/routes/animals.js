const express = require("express");
const router = express.Router();
const Animal = require("../models/Pet");
const Owner = require("../models/Owner");
const { protect } = require("../middleware/auth");

// ---------------------
// ADD ANIMAL
// ---------------------
router.post("/", protect, async (req, res) => {
  try {
    const { ownerId, ...animalData } = req.body;

    if (!ownerId) {
      return res.status(400).json({ message: "ownerId is required" });
    }

    const animal = await Animal.create({
      ...animalData,
      species: animalData.species?.toLowerCase(),
      ownerId,
      user: req.user.id,
    });

    await Owner.findByIdAndUpdate(ownerId, {
      $push: { animals: animal._id },
    });

    res.status(201).json(animal);
  } catch (err) {
    console.error("ADD ANIMAL ERROR:", err);
    res.status(400).json({ message: err.message });
  }
});

// ---------------------
// GET ALL ANIMALS
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const animals = await Animal.find({ user: req.user.id });
    res.json(animals);
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
    const animal = await Animal.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!animal) return res.status(404).json({ message: "Not found" });
    res.json(animal);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch animal" });
  }
});

// ---------------------
// SAVE / UPDATE SCHEDULE (V2)
// ---------------------
router.put("/:animalId/schedule", protect, async (req, res) => {
  try {
    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    });

    if (!animal) return res.status(404).json({ message: "Animal not found" });

    const { vaccineSchedule, dewormingSchedule } = req.body;

    // Replace the entire schedule arrays
    if (vaccineSchedule) {
      animal.vaccineSchedule = vaccineSchedule.map((row) => ({
        stage:       row.stage || "",
        vaccineName: row.vaccineName || "",
        interval:    row.interval || 0,
        dueDate:     row.dueDate ? new Date(row.dueDate) : null,
        status:      row.status || "pending",
        notes:       row.notes || "",
      }));
    }

    if (dewormingSchedule) {
      animal.dewormingSchedule = dewormingSchedule.map((row) => ({
        dewormingName: row.dewormingName || "",
        interval:      row.interval || 0,
        dueDate:       row.dueDate ? new Date(row.dueDate) : null,
        status:        row.status || "pending",
        notes:         row.notes || "",
      }));
    }

    await animal.save();
    res.json({ success: true, animal });

  } catch (err) {
    console.error("SAVE SCHEDULE ERROR:", err);
    res.status(500).json({ message: "Failed to save schedule" });
  }
});

// ---------------------
// ADD ANIMAL ACTIVITIES (vaccine / deworming)
// ---------------------
router.put("/:animalId/activities", protect, async (req, res) => {
  try {
    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    });

    if (!animal) return res.status(404).json({ message: "Animal not found" });

    /* =====================
       💉 VACCINE
       ===================== */
    if (req.body.vaccineInfo) {
      if (animal.vaccineInfo?.vaccineType) {
        animal.vaccineHistory.push({
          vaccineType: animal.vaccineInfo.vaccineType,
          stage: animal.vaccineInfo.stage,
          status:
            animal.vaccineInfo.vaccineStatus === "completed"
              ? "completed"
              : "missed",
          date:
            animal.vaccineInfo.lastVaccineDate ||
            animal.vaccineInfo.nextVaccineDate,
        });
      }

      if (
        !req.body.vaccineInfo.stage ||
        !["1st", "2nd", "3rd", "4th", "Annual", "Custom"].includes(
          req.body.vaccineInfo.stage
        )
      ) {
        return res
          .status(400)
          .json({ message: "Invalid or missing vaccine stage" });
      }

      animal.vaccineInfo = {
        presentVaccineType: req.body.vaccineInfo.presentVaccineType || "",
        vaccineType: req.body.vaccineInfo.vaccineType,
        stage: req.body.vaccineInfo.stage,
        customStage: req.body.vaccineInfo.customStage || "",
        nextVaccineDate: req.body.vaccineInfo.nextVaccineDate || null,
        lastVaccineDate: null,
        vaccineStatus: "pending",
        thankYouSent: false,
      };
    }

    /* =====================
       🪱 DEWORMING
       ===================== */
    if (req.body.dewormingInfo) {
      if (animal.dewormingInfo?.dewormingName) {
        animal.dewormingHistory.push({
          dewormingName: animal.dewormingInfo.dewormingName,
          status:
            animal.dewormingInfo.dewormingStatus === "completed"
              ? "completed"
              : "missed",
          date:
            animal.dewormingInfo.lastDewormingDate ||
            animal.dewormingInfo.nextDewormingDate,
        });
      }

      animal.dewormingInfo = {
        presentDewormingName: req.body.dewormingInfo.presentDewormingName || "",
        dewormingName: req.body.dewormingInfo.dewormingName || "",
        nextDewormingDate: req.body.dewormingInfo.nextDewormingDate || null,
        lastDewormingDate: null,
        dewormingStatus: "pending",
        thankYouSent: false,
      };
    }

    await animal.save();
    res.json(animal);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err, message: err.message });
  }
});

// ---------------------
// DELETE ANIMAL
// ---------------------
router.delete("/:id", protect, async (req, res) => {
  try {
    const deleted = await Animal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Animal not found" });
    }

    res.json({ message: "Animal deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

// ---------------------
// DELETE SINGLE VACCINE HISTORY ENTRY
// ---------------------
router.delete(
  "/:animalId/vaccine-history/:historyIndex",
  protect,
  async (req, res) => {
    try {
      const { animalId, historyIndex } = req.params;

      const animal = await Animal.findOne({
        _id: animalId,
        user: req.user.id,
      });

      if (!animal) return res.status(404).json({ message: "Animal not found" });

      animal.vaccineHistory.splice(historyIndex, 1);
      await animal.save();

      res.json(animal);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  }
);



module.exports = router;