const express = require("express");
const router = express.Router();
const Owner = require("../models/Owner");
const Animal = require("../models/Pet");
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

    let owner = await Owner.findOne({ phone, user: req.user.id });

    if (owner) return res.json(owner);

    owner = await Owner.create({
      name,
      phone,
      email,
      address,
      user: req.user.id,
    });

    res.status(201).json(owner);
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
    const owners = await Owner.find({ user: req.user.id });
    res.json(owners);
  } catch (err) {
    console.error("FETCH OWNERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch owners" });
  }
});

// ---------------------
// GET OWNER + ANIMALS BY ID
// ---------------------
router.get("/:id", protect, async (req, res) => {
  try {
    const owner = await Owner.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const animals = await Animal.find({
      ownerId: owner._id,
      user: req.user.id,
    });

    res.json({ ...owner.toObject(), animals });
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

    const animals = await Animal.find({ ownerId, user: req.user.id });

    let notificationsReceived = 0;
    let notificationsMissed = 0;
    let clinicVisits = 0;

    animals.forEach((animal) => {
      animal.vaccineHistory.forEach((v) => {
        if (v.status === "completed") notificationsReceived++;
        if (v.status === "missed") notificationsMissed++;
      });

      animal.dewormingHistory.forEach((d) => {
        if (d.status === "completed") notificationsReceived++;
        if (d.status === "missed") notificationsMissed++;
      });

      if (animal.vaccineInfo?.thankYouSent) clinicVisits++;
      if (animal.dewormingInfo?.thankYouSent) clinicVisits++;
    });

    res.json({ notificationsReceived, notificationsMissed, clinicVisits });
  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
});

module.exports = router;