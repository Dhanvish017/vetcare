require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const User = require("./models/User");
const Animal = require("./models/Pet");
const { protect } = require("./middleware/auth");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

const cron = require("node-cron");

const notifyRoutes = require("./routes/notify");

// ---------------------
// DATABASE CONNECTION
// ---------------------
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vetcare")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// ---------------------
// BASIC ROUTE
// ---------------------
app.get("/", (req, res) => {
  res.json({ message: "VetCare API Running" });
});

// ---------------------
// SIGNUP
// ---------------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({ name, email, password: hashed });

    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------
// LOGIN
// ---------------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Password incorrect" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "vinay_super_secret",
      { expiresIn: "7d" }
    );

    res.json({ message: "Success", token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------
// PROFILE (GET)
// ---------------------
app.get("/profile", protect, async (req, res) => {
  res.json(req.user);
});

// ---------------------
// PROFILE UPDATE
// ---------------------
app.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, {
      new: true
    }).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// ---------------------
// ADD ANIMAL
// ---------------------
app.post("/api/animals", async (req, res) => {
  try {
    const animal = new Animal({
      ...req.body,
      vaccineInfo: {
        vaccineType: req.body.vaccineType,
        vaccineBrand: req.body.vaccineBrand,
        vaccineStatus: req.body.vaccineStatus,
        vaccineDate: req.body.vaccineDate
      },

      vaccineHistory:
        req.body.vaccineStatus === "administered"
          ? [
              {
                vaccineType: req.body.vaccineType,
                vaccineBrand: req.body.vaccineBrand,
                status: req.body.vaccineStatus,
                date: req.body.vaccineDate || new Date(),
              },
            ]
          : [],
    });

    await animal.save();
    res.status(201).json(animal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------
// GET ALL ANIMALS
// ---------------------
app.get("/api/animals", async (req, res) => {
  res.json(await Animal.find());
});

// ---------------------
// GET ANIMAL BY ID
// ---------------------
app.get("/api/animals/:id", async (req, res) => {
  const animal = await Animal.findById(req.params.id);
  if (!animal) return res.status(404).json({ message: "Not found" });
  res.json(animal);
});

// ---------------------
// UPDATE ANIMAL
// ---------------------
app.put("/api/animals/:id", async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: "Not found" });

    // update vaccine info
    animal.vaccineInfo = {
      vaccineType: req.body.vaccineType,
      vaccineBrand: req.body.deworming,
      vaccineStatus: req.body.vaccineStatus,
      vaccineDate: req.body.vaccineDate,
    };

    // push to history only if administered
    if (req.body.vaccineStatus === "administered") {
      animal.vaccineHistory.push({
        vaccineType: req.body.vaccineType,
        vaccineBrand: req.body.deworming,
        status: req.body.vaccineStatus,
        date: req.body.vaccineDate || new Date(),
      });
    }

    Object.assign(animal, req.body);

    await animal.save();
    res.json(animal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------
// DELETE ANIMAL
// ---------------------
app.delete("/api/animals/:id", async (req, res) => {
  try {
    const deleted = await Animal.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Animal not found" });
    }

    res.json({ message: "Animal deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

// DELETE SINGLE VACCINE HISTORY ENTRY
app.delete("/api/animals/:animalId/vaccine-history/:historyIndex", async (req, res) => {
  try {
    const { animalId, historyIndex } = req.params;

    const animal = await Animal.findById(animalId);
    if (!animal) return res.status(404).json({ message: "Animal not found" });

    // remove one history entry
    animal.vaccineHistory.splice(historyIndex, 1);

    await animal.save();
    res.json(animal);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete entry" });
  }
});

// ---------------------
app.use("/api/notify", notifyRoutes);

// ---------------------
app.listen(process.env.PORT || 5001, () =>
  console.log(`Server running`)
);
