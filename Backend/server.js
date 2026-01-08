require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const User = require("./models/User");
const Animal = require("./models/Pet");
const { protect } = require("./middleware/auth");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");




app.use(express.json());
app.use(
  cors({
    origin: [
      "https://vetcare-peach.vercel.app",  // your frontend URL (update if different)
      "http://localhost:5173"        // for local dev (Vite)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const notifyRoutes = require("./routes/notify");
app.use("/api/notify", notifyRoutes);


const cron = require("node-cron");

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
    console.log("SIGNUP REQUEST BODY:", req.body);

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
    console.error("SIGNUP SERVER ERROR:", err);  // <-- FULL ERROR HERE
    res.status(500).json({ message: "Server Error", error: err.message });
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
// ADD ANIMAL INFO
// ---------------------
app.post("/api/animals", protect, async (req, res) => {
  try {
    const animal = await Animal.create({
      ...req.body,        // includes vaccineInfo, owner, etc.
      user: req.user.id,  // enforce logged-in user ownership
    });

    res.status(201).json(animal);
  } catch (err) {
    console.error("Add animal error:", err);
    res.status(400).json({ message: err.message });
  }
});

// ---------------------
// ADD ANIMAL ACTIVITIES
// ---------------------
app.put("/api/animals/:animalId/activities", protect, async (req, res) => {
  try {
    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    });

    if (!animal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    /* =====================
       💉 VACCINE
       ===================== */
    if (req.body.vaccineInfo) {
      // push old data to history BEFORE overwrite
      if (animal.vaccineInfo?.vaccineType) {
        animal.vaccineHistory.push({
          vaccineType: animal.vaccineInfo.vaccineType,
          stage: animal.vaccineInfo.stage,
          status: animal.vaccineInfo.vaccineStatus,
          date: animal.vaccineInfo.vaccineDate,
        });
      }

      animal.vaccineInfo = req.body.vaccineInfo;
    }

    /* =====================
       🪱 DEWORMING
       ===================== */
    if (req.body.dewormingInfo) {
      if (animal.dewormingInfo?.dewormingName) {
        animal.dewormingHistory.push({
          dewormingName: animal.dewormingInfo.dewormingName,
          date: animal.dewormingInfo.nextDewormingDate,
        });
      }

      animal.dewormingInfo = req.body.dewormingInfo;
    }

    /* =====================
       ❤️ HEALTH CHECKUP
       ===================== */
       if (req.body.healthCheckupInfo) {

        // Push previous checkup into history (if exists)
        if (animal.healthCheckupInfo?.todayCheckup) {
          animal.healthCheckupHistory.push({
            todayCheckup: animal.healthCheckupInfo.todayCheckup,
            date: new Date(),
          });
        }
      
        // Update current health checkup
        animal.healthCheckupInfo = {
          todayCheckup: req.body.healthCheckupInfo.todayCheckup,
          nextCheckupDate: req.body.healthCheckupInfo.nextCheckupDate,
        };
      }

    await animal.save();
    res.json(animal);

  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});




// ---------------------
// GET ALL ANIMALS
// ---------------------
app.get("/api/animals", protect, async (req, res) => {
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
app.get("/api/animals/:id",protect, async (req, res) => {
  const animal = await Animal.findOne({ 
    _id: req.params.id,
    user: req.user.id 
  });
  if (!animal) return res.status(404).json({ message: "Not found" });
  res.json(animal);
});

// ---------------------
// UPDATE ANIMAL
// ---------------------
app.put("/api/animals/:id",protect, async (req, res) => {
  try {
    const animal = await Animal.findOne({ 
      _id: req.params.id,
      user: req.user.id 
    });
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
app.delete("/api/animals/:id",protect, async (req, res) => {
  try {
    const deleted = await Animal.findOneAndDelete({ 
      _id: req.params.id,
      user: req.user.id 
    });

    if (!deleted) {
      return res.status(404).json({ message: "Animal not found" });
    }

    res.json({ message: "Animal deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

// DELETE SINGLE VACCINE HISTORY ENTRY
app.delete("/api/animals/:animalId/vaccine-history/:historyIndex", protect,async (req, res) => {
  try {
    const { animalId, historyIndex } = req.params;

    const animal = await Animal.findOne({ 
      _id: animalId,
      user: req.user.id 
    });
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
// REMINDERS: VACCINE TODAY
// ---------------------
app.get("/api/reminders/today", protect, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const animals = await Animal.find({
      user: req.user.id,
      "owner.phone": { $exists: true, $ne: "" },
      $or: [
        { "vaccineInfo.nextVaccineDate": { $gte: start, $lte: end } },
        { "dewormingInfo.nextDewormingDate": { $gte: start, $lte: end } }
      ]
    });

    const reminders = [];

    animals.forEach(animal => {
      if (
        animal.vaccineInfo?.nextVaccineDate >= start &&
        animal.vaccineInfo?.nextVaccineDate <= end
      ) {
        reminders.push({
          _id: `${animal._id}-vaccine`,
          animalId: animal._id,
          type: "vaccine",
          name: animal.name,
          species: animal.species,
          breed: animal.breed,
          age: animal.age,
          owner: animal.owner,
          dueDate: animal.vaccineInfo.nextVaccineDate,
          vaccineInfo: animal.vaccineInfo
        });
      }

      if (
        animal.dewormingInfo?.nextDewormingDate >= start &&
        animal.dewormingInfo?.nextDewormingDate <= end
      ) {
        reminders.push({
          _id: `${animal._id}-deworming`,
          animalId: animal._id,
          type: "deworming",
          name: animal.name,
          species: animal.species,
          breed: animal.breed,
          age: animal.age,
          owner: animal.owner,
          dueDate: animal.dewormingInfo.nextDewormingDate,
          dewormingInfo: animal.dewormingInfo
        });
      }
    });

    res.json(reminders);
  } catch (err) {
    console.error("Reminder fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ---------------------
// UPDATE VACCINE STATUS
// ---------------------
app.patch("/api/animals/:animalId/complete", protect, async (req, res) => {
  try {
    const { type } = req.body; // "vaccine" | "deworming"

    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    });

    if (!animal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    if (type === "vaccine" && animal.vaccineInfo?.vaccineType) {
      animal.vaccineHistory.push({
        vaccineType: animal.vaccineInfo.vaccineType,
        stage: animal.vaccineInfo.stage,
        date: animal.vaccineInfo.vaccineDate || new Date(),
        status: "completed",
      });

      animal.vaccineInfo = {}; // remove reminder
    }

    if (type === "deworming" && animal.dewormingInfo?.dewormingName) {
      animal.dewormingHistory.push({
        dewormingName: animal.dewormingInfo.dewormingName,
        date: new Date(),
      });

      animal.dewormingInfo = {};
    }

    await animal.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Complete activity error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

  

// ---------------------
app.listen(process.env.PORT || 5001, () =>
  console.log(`Server running`)
);
