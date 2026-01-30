require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const User = require("./models/User");
const Animal = require("./models/Pet");
const Owner = require("./models/Owner");
const messageTemplates = require("./utils/messageTemplates");

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

    res.json({
      token,
      isProfileComplete: user.isProfileComplete,
    });    
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
    const { ownerId, ...animalData } = req.body;

    if (!ownerId) {
      return res.status(400).json({ message: "ownerId is required" });
    }

    // 1️⃣ Create animal with ownerId
    const animal = await Animal.create({
      ...animalData,
      ownerId,
      user: req.user.id,
    });

    // 2️⃣ Push animal into owner.animals[]
    await Owner.findByIdAndUpdate(ownerId, {
      $push: { animals: animal._id },
    });

    res.status(201).json(animal);
  } catch (err) {
    console.error("ADD ANIMAL ERROR:", err);
    res.status(400).json({ message: err.message });
  }
});


// CREATE OWNER (first time)
app.post("/api/owners", protect, async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone required" });
    }

    // avoid duplicate owner by phone
    let owner = await Owner.findOne({ phone, user: req.user.id });

    if (owner) {
      return res.json(owner);
    }

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
// GET ALL OWNERS
// ---------------------
app.get("/api/owners", protect, async (req, res) => {
  try {
    const owners = await Owner.find({ user: req.user.id });
    res.json(owners);
  } catch (err) {
    console.error("FETCH OWNERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch owners" });
  }
});

// ---------------------
// GET OWNER + ANIMALS (SAFE)
// ---------------------
app.get("/api/owners/:id", protect, async (req, res) => {
  try {
    const owner = await Owner.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    const animals = await Animal.find({
      ownerId: owner._id,
      user: req.user.id,
    });

    res.json({
      ...owner.toObject(),
      animals,
    });
  } catch (err) {
    console.error("REAL FETCH OWNER ERROR:", err);
    res.status(500).json({ message: err.message });
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
/*app.put("/api/animals/:id",protect, async (req, res) => {
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
});*/

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
// REMINDERS: NEXT 7 DAYS
// ---------------------
app.get("/api/reminders", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const animals = await Animal.find({
      user: req.user.id,
    });

    const reminders = [];

    animals.forEach((animal) => {
      // 💉 VACCINE
      if (
        animal.vaccineInfo?.nextVaccineDate &&
        animal.vaccineInfo.vaccineStatus === "pending"
      ) {
        const date = new Date(animal.vaccineInfo.nextVaccineDate);
        if (date >= today && date <= weekEnd) {
          reminders.push({
            _id: `${animal._id}-vaccine`,
            type: "vaccine",
            dueDate: date,
            animalId: animal._id,
            animalName: animal.name,
            species: animal.species,
            ownerId: animal.ownerId,
          });
        }
      }

      // 🪱 DEWORMING
      if (
        animal.dewormingInfo?.nextDewormingDate &&
        animal.dewormingInfo.dewormingStatus === "pending"
      ) {
        const date = new Date(animal.dewormingInfo.nextDewormingDate);
        if (date >= today && date <= weekEnd) {
          reminders.push({
            _id: `${animal._id}-deworming`,
            type: "deworming",
            dueDate: date,
            animalId: animal._id,
            animalName: animal.name,
            species: animal.species,
            ownerId: animal.ownerId,
          });
        }
      }
    });

    res.json(reminders);
  } catch (err) {
    console.error("REMINDER ERROR:", err);
    res.status(500).json({ message: "Failed to fetch reminders" });
  }
});


/// notification template 
app.post("/api/notify/whatsapp-template", protect, async (req, res) => {
  try {
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: "Template is required" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      whatsappTemplate: templateId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to save template" });
  }
});


// LIST ALL AVAILABLE TEMPLATES (READ-ONLY)
app.get("/api/notify/templates", protect, (req, res) => {
  try {
    const templates = Object.values(messageTemplates).map(t => ({
      id: t.id,
      label: t.label,
      preview: t.body.slice(0, 120) + "..."
    }));

    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: "Failed to load templates" });
  }
});


//read selected template
app.get("/api/notify/whatsapp-template", protect , async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("whatsappTemplate");
    res.json({ templateId: user.whatsappTemplate });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});


//notification complete button 
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

    // 🔥 TEMP SAFETY FOR OLD RECORDS
    if (!animal.ownerId) {
      return res.status(400).json({
        message: "Animal missing ownerId. Please re-add animal.",
      });
    }

    if (type === "vaccine" && animal.vaccineInfo?.vaccineType) {
      animal.vaccineHistory.push({
        vaccineType: animal.vaccineInfo.vaccineType,
        stage: animal.vaccineInfo.stage || "",
        date: animal.vaccineInfo.nextVaccineDate || new Date(),
        status: "completed",
      });
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
    res.json({ success: true });
  } catch (err) {
    console.error("COMPLETE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});



/// ---------------------
// DASHBOARD: TOTAL STATS
// ---------------------
app.get("/api/dashboard/stats", protect, async (req, res) => {
  try {
    const animals = await Animal.find({ user: req.user.id });

    let vaccinePending = 0;
    let vaccineCompleted = 0;
    let dewormingPending = 0;
    let dewormingCompleted = 0;

    animals.forEach(animal => {
      // 💉 VACCINE
      if (animal.vaccineInfo?.vaccineType) {
        if (animal.vaccineInfo.vaccineStatus === "completed") {
          vaccineCompleted++;
        } else {
          vaccinePending++;
        }
      }

      // 🪱 DEWORMING
      if (animal.dewormingInfo?.dewormingName) {
        if (animal.dewormingInfo.dewormingStatus === "completed") {
          dewormingCompleted++;
        } else {
          dewormingPending++;
        }
      }
    });

    res.json({
      vaccine: {
        pending: vaccinePending,
        completed: vaccineCompleted,
      },
      deworming: {
        pending: dewormingPending,
        completed: dewormingCompleted,
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
