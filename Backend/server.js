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
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.urlencoded({ extended: true }));

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

// send otp
app.post("/api/send-otp", async (req, res) => {
  try {
    console.log("RAW BODY:", req.body);

    const phone = req.body.phone;

    if (!phone) {
      return res.status(400).json({ message: "Phone missing in request body" });
    }

    const otp = "123456";
    const expires = Date.now() + 5 * 60 * 1000;

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        otp,
        otpExpiresAt: expires,
      });
    } else {
      user.otp = otp;
      user.otpExpiresAt = expires;
      await user.save();
    }

    console.log("OTP SENT:", phone, otp);
    res.json({ success: true });

  } catch (err) {
    console.error("SEND OTP ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});



//verify otp
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // 🔥 FIND BY PHONE
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    // clear OTP after success
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// CREATE ACCOUNT
app.put("/api/profile", protect, async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      clinicName,
      accountType,
    } = req.body;

    // BASIC VALIDATION
    if (!name || !email || !address || !accountType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (accountType === "clinic" && !clinicName) {
      return res.status(400).json({ message: "Clinic name required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        email,
        address,
        clinicName: accountType === "clinic" ? clinicName : null,
        accountType,
        isProfileComplete: true, // VERY IMPORTANT
      },
      { new: true }
    );

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Profile update failed" });
  }
});


// GET PROFILE
app.get("/api/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-otp -otpExpiresAt");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
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
          date: animal.vaccineInfo.nextVaccineDate,
        });
      }

      if (
        !req.body.vaccineInfo.stage ||
        !["1st", "2nd", "3rd", "4th", "Custom"].includes(req.body.vaccineInfo.stage)
      ) {
        return res.status(400).json({
          message: "Invalid or missing vaccine stage",
        });
      }
      

      animal.vaccineInfo = {
        presentVaccineType: req.body.vaccineInfo.presentVaccineType || "",
        vaccineType: req.body.vaccineInfo.vaccineType,
        stage: req.body.vaccineInfo.stage,
        customStage: req.body.vaccineInfo.customStage || "",
        vaccineStatus: "pending",
        nextVaccineDate: req.body.vaccineInfo.nextVaccineDate,
      };
      
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

      animal.dewormingInfo = {
        presentDewormingName: req.body.dewormingInfo.presentDewormingName || "",
        dewormingName: req.body.dewormingInfo.dewormingName || "",
        nextDewormingDate: req.body.dewormingInfo.nextDewormingDate,
        dewormingStatus: "pending",
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
        {
          "vaccineInfo.nextVaccineDate": { $gte: start, $lte: end },
        },
        {
          "dewormingInfo.nextDewormingDate": { $gte: start, $lte: end },
        }
      ]      
    });

    const reminders = [];

    animals.forEach(animal => {
      if (
        animal.vaccineInfo?.nextVaccineDate >= start &&
        animal.vaccineInfo?.nextVaccineDate <= end &&
        animal.vaccineInfo?.vaccineStatus !== "completed"
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
          vaccineStatus: animal.vaccineInfo.vaccineStatus,
          vaccineInfo: animal.vaccineInfo
        });
      }

      if (
        animal.dewormingInfo?.nextDewormingDate >= start &&
        animal.dewormingInfo?.nextDewormingDate <= end &&
        animal.dewormingInfo?.dewormingStatus !== "completed"
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
          dewormingStatus: animal.dewormingInfo.dewormingStatus,
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



app.patch("/api/animals/:animalId/complete", protect, async (req, res) => {
  try {
    const { type } = req.body;

    const animal = await Animal.findOne({
      _id: req.params.animalId,
      user: req.user.id,
    });

    if (!animal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    if (type === "vaccine" && animal.vaccineInfo?.vaccineType) {
      // push history
      animal.vaccineHistory.push({
        vaccineType: animal.vaccineInfo.vaccineType,
        stage: animal.vaccineInfo.stage,
        date: animal.vaccineInfo.nextvaccineDate || new Date(),
        status: "completed",
      });

      // ✅ update status (DO NOT DELETE)
      animal.vaccineInfo.vaccineStatus = "completed";
    }

    if (type === "deworming" && animal.dewormingInfo?.dewormingName) {
      animal.dewormingHistory.push({
        dewormingName: animal.dewormingInfo.dewormingName,
        date: animal.dewormingInfo.nextDewormingDate || new Date(),
      });

      animal.dewormingInfo.dewormingStatus = "completed";
    }

    await animal.save();
    res.json({ success: true, animal });
  } catch (err) {
    console.error("Complete activity error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------
// DASHBOARD: TODAY STATS
// ---------------------
app.get("/api/dashboard/stats", protect, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 🟡 VACCINE PENDING (today)
    const vaccinePending = await Animal.countDocuments({
      user: req.user.id,
      "vaccineInfo.nextVaccineDate": {
        $exists: true,
        $gte: start,
        $lte: end,
      },
      "vaccineInfo.vaccineStatus": "pending",
    });

    // 🟢 VACCINE COMPLETED (unique animals today)
    const vaccineCompletedAgg = await Animal.aggregate([
      { $match: { user: req.user.id } },
      { $unwind: "$vaccineHistory" },
      {
        $match: {
          "vaccineHistory.date": { $gte: start, $lte: end },
        },
      },
      { $group: { _id: "$_id" } }, // unique animal
      { $count: "count" },
    ]);

    // 🟡 DEWORMING PENDING (today)
    const dewormingPending = await Animal.countDocuments({
      user: req.user.id,
      "dewormingInfo.nextDewormingDate": {
        $exists: true,
        $gte: start,
        $lte: end,
      },
      "dewormingInfo.dewormingStatus": "pending",
    });

    // 🟢 DEWORMING COMPLETED (unique animals today)
    const dewormingCompletedAgg = await Animal.aggregate([
      { $match: { user: req.user.id } },
      { $unwind: "$dewormingHistory" },
      {
        $match: {
          "dewormingHistory.date": { $gte: start, $lte: end },
        },
      },
      { $group: { _id: "$_id" } }, // unique animal
      { $count: "count" },
    ]);

    res.json({
      vaccine: {
        pending: vaccinePending,
        completed: vaccineCompletedAgg[0]?.count || 0,
      },
      deworming: {
        pending: dewormingPending,
        completed: dewormingCompletedAgg[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

 

// ---------------------
app.listen(process.env.PORT || 5001, () =>
  console.log(`Server running`)
);
