const express = require("express");
const router = express.Router();
const Animal = require("../models/Pet");
const ReminderLog = require("../models/ReminderLog");
const { protect } = require("../middleware/auth");

// ---------------------
// HELPERS
// ---------------------
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

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------------------
// GET NOTIFICATIONS: TODAY | TOMORROW | 7TH DAY
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    const today = normalize(getISTDate());

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const seventhDay = new Date(today);
    seventhDay.setDate(today.getDate() + 7);

    const animals = await Animal.find({ user: req.user.id }).populate(
      "ownerId", "name phone"
    );

    const notifications = { today: [], tomorrow: [], seventhDay: [] };

    animals.forEach((animal) => {

      // 💉 VACCINE SCHEDULE
      (animal.vaccineSchedule || []).forEach((row) => {
        if (!row.dueDate || row.status !== "pending") return;
        if (!row.vaccineName) return;

        const dueDate = normalize(row.dueDate);

        const payload = {
          _id: `${animal._id}-vaccine-${row._id}`,
          type: "vaccine",
          status: row.status, 
          scheduleRowId: row._id,
          stage: row.stage,
          vaccineName: row.vaccineName,
          dueDate,
          animalId: animal._id,
          animalName: animal.name,
          species: animal.species,
          ownerId: animal.ownerId?._id,
          ownerName: animal.ownerId?.name || "Pet Owner",
          ownerPhone: animal.ownerId?.phone || "",
        };

        if (dueDate.getTime() === today.getTime())      notifications.today.push(payload);
        if (dueDate.getTime() === tomorrow.getTime())   notifications.tomorrow.push(payload);
        if (dueDate.getTime() === seventhDay.getTime()) notifications.seventhDay.push(payload);
      });

      // 🪱 DEWORMING SCHEDULE
      (animal.dewormingSchedule || []).forEach((row) => {
        if (!row.dueDate || row.status !== "pending") return;

        const dueDate = normalize(row.dueDate);
        if (!row.dewormingName) return;

        const payload = {
          _id: `${animal._id}-deworming-${row._id}`,
          type: "deworming",
          scheduleRowId: row._id,
          dewormingName: row.dewormingName,
          dueDate,
          animalId: animal._id,
          animalName: animal.name,
          species: animal.species,
          ownerId: animal.ownerId?._id,
          ownerName: animal.ownerId?.name || "Pet Owner",
          ownerPhone: animal.ownerId?.phone || "",
        };

        if (dueDate.getTime() === today.getTime())      notifications.today.push(payload);
        if (dueDate.getTime() === tomorrow.getTime())   notifications.tomorrow.push(payload);
        if (dueDate.getTime() === seventhDay.getTime()) notifications.seventhDay.push(payload);
      });
    });

    res.json(notifications);
  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// ---------------------
// GET MISSED (pending rows 3+ days past dueDate)
// ---------------------
router.get("/missed", protect, async (req, res) => {
  try {
    const today = startOfDay(getISTDate());

    const animals = await Animal.find({ user: req.user.id }).populate(
      "ownerId", "name phone"
    );

    const missed = [];

    animals.forEach((animal) => {

      // 💉 VACCINE
      (animal.vaccineSchedule || []).forEach((row) => {
        if (!row.dueDate || row.status !== "pending") return;

        const dueDate = new Date(row.dueDate);
        const thirdDay = new Date(dueDate);
        thirdDay.setDate(thirdDay.getDate() + 3);

        if (today >= startOfDay(thirdDay)) {
          missed.push({
            _id: `${animal._id}-vaccine-${row._id}`,
            type: "vaccine",
            scheduleRowId: row._id,
            stage: row.stage,
            vaccineName: row.vaccineName,
            dueDate,
            animalId: animal._id,
            animalName: animal.name,
            species: animal.species,
            ownerId: animal.ownerId?._id,
            ownerName: animal.ownerId?.name || "Pet Owner",
            ownerPhone: animal.ownerId?.phone || "",
          });
        }
      });

      // 🪱 DEWORMING
      (animal.dewormingSchedule || []).forEach((row) => {
        if (!row.dueDate || row.status !== "pending") return;

        const dueDate = new Date(row.dueDate);
        const thirdDay = new Date(dueDate);
        thirdDay.setDate(thirdDay.getDate() + 3);

        if (today >= startOfDay(thirdDay)) {
          missed.push({
            _id: `${animal._id}-deworming-${row._id}`,
            type: "deworming",
            scheduleRowId: row._id,
            dewormingName: row.dewormingName,
            dueDate,
            animalId: animal._id,
            animalName: animal.name,
            species: animal.species,
            ownerId: animal.ownerId?._id,
            ownerName: animal.ownerId?.name || "Pet Owner",
            ownerPhone: animal.ownerId?.phone || "",
          });
        }
      });
    });

    res.json(missed);
  } catch (err) {
    console.error("MISSED ERROR:", err);
    res.status(500).json({ message: "Failed to fetch missed" });
  }
});

// ---------------------
// GET THANK-YOU LIST (pending rows due today)
// ---------------------
router.get("/thank-you", protect, async (req, res) => {
  try {
    const today = normalize(new Date());

    const animals = await Animal.find({ user: req.user.id }).populate(
      "ownerId", "name phone"
    );

    const thanksList = [];

    animals.forEach((animal) => {

      // 💉 VACCINE
      (animal.vaccineSchedule || []).forEach((row) => {
        if (!row.dueDate || row.status !== "completed") return;

        const dueDate = normalize(row.dueDate);
        if (dueDate.getTime() === today.getTime()) {
          thanksList.push({
            _id: `${animal._id}-vaccine-${row._id}`,
            type: "vaccine",
            scheduleRowId: row._id,
            stage: row.stage,
            vaccineName: row.vaccineName,
            dueDate,
            animalId: animal._id,
            animalName: animal.name,
            species: animal.species,
            ownerName: animal.ownerId?.name || "Pet Owner",
            ownerPhone: animal.ownerId?.phone || "",
          });
        }
      });

      // 🪱 DEWORMING
      (animal.dewormingSchedule || []).forEach((row) => {
        if (!row.dueDate || row.status !== "completed") return;

        const dueDate = normalize(row.dueDate);
        if (dueDate.getTime() === today.getTime()) {
          thanksList.push({
            _id: `${animal._id}-deworming-${row._id}`,
            type: "deworming",
            scheduleRowId: row._id,
            dewormingName: row.dewormingName,
            dueDate,
            animalId: animal._id,
            animalName: animal.name,
            species: animal.species,
            ownerName: animal.ownerId?.name || "Pet Owner",
            ownerPhone: animal.ownerId?.phone || "",
          });
        }
      });
    });

    res.json(thanksList);
  } catch (err) {
    console.error("THANK YOU ERROR:", err);
    res.status(500).json({ message: "Failed to fetch thank you list" });
  }
});

// ---------------------
// SEND WHATSAPP REMINDER (log only)
// ---------------------
router.post("/send-whatsapp/:animalId", protect, async (req, res) => {
  try {
    const { type, scheduleRowId } = req.body;

    if (!type || !["vaccine", "deworming"].includes(type)) {
      return res.status(400).json({ message: "type required (vaccine | deworming)" });
    }

    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    }).populate("ownerId", "name phone");

    if (!animal) return res.status(404).json({ message: "Animal not found" });
    if (!animal.ownerId) return res.status(400).json({ message: "Animal missing owner" });

    await ReminderLog.create({
      user: req.user.id,
      animalId: animal._id,
      ownerId: animal.ownerId._id,
      type,
      reminderWindow: "today",
      sentAt: new Date(),
      visited: false,
      thankyouSent: false,
    });

    res.json({ success: true, message: "Reminder logged" });
  } catch (err) {
    console.error("SEND WHATSAPP ERROR:", err);
    res.status(500).json({ message: "Failed to send reminder" });
  }
});

// ---------------------
// SEND FOLLOW-UP (MISSED)
// ---------------------
router.post("/send-followup/:animalId", protect, async (req, res) => {
  try {
    const { type, scheduleRowId } = req.body;

    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    }).populate("ownerId");

    if (!animal) return res.status(404).json({ message: "Animal not found" });
    if (!animal.ownerId) return res.status(400).json({ message: "Owner missing" });

    await ReminderLog.create({
      user: req.user.id,
      animalId: animal._id,
      ownerId: animal.ownerId._id,
      type,
      reminderWindow: "missed",
      sentAt: new Date(),
      visited: false,
      thankyouSent: false,
      followupSent: true,
    });

    res.json({ success: true, message: "Follow-up logged" });
  } catch (err) {
    console.error("FOLLOWUP ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});



// ---------------------
// SEND THANK YOU + MARK SCHEDULE ROW COMPLETED
// ---------------------
router.post("/send-thank-you/:animalId", protect, async (req, res) => {
  try {
    const { type, scheduleRowId } = req.body;

    if (!scheduleRowId) {
      return res.status(400).json({ message: "scheduleRowId is required" });
    }

    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    });

    if (!animal) return res.status(404).json({ message: "Animal not found" });

    // ✅ Mark the specific schedule row as completed by its _id
    if (type === "vaccine") {
      const row = animal.vaccineSchedule.id(scheduleRowId);
      if (row) row.status = "completed";
    }

    if (type === "deworming") {
      const row = animal.dewormingSchedule.id(scheduleRowId);
      if (row) row.status = "completed";
    }

    await animal.save();

    await ReminderLog.create({
      user: req.user.id,
      animalId: animal._id,
      ownerId: animal.ownerId,
      type,
      reminderWindow: "thankyou",
      sentAt: new Date(),
      visited: true,
      thankyouSent: true,
    });

    res.json({ success: true, message: "Thank you sent & row marked completed" });
  } catch (err) {
    console.error("THANK YOU ERROR:", err);
    res.status(500).json({ message: "Failed to send thank you" });
  }
});



module.exports = router;

