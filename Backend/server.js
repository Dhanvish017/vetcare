require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const User = require("./models/User");
const Animal = require("./models/Pet");
const Owner = require("./models/Owner");

const { protect } = require("./middleware/auth");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ReminderLog = require("./models/ReminderLog");



const IST_OFFSET_MINUTES = 330;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getISTDate = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + IST_OFFSET_MINUTES);
  return d;
};

const messageTemplates = require("./utils/messageTemplates");



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

const analyticRoutes = require("./routes/analyticsRoutes");
app.use("/api/analytics", analyticRoutes);


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



/// SEND OTP (DEV MODE)
app.post("/api/send-otp", async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone missing" });
    }

    // ✅ Normalize phone
    phone = phone.replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    if (phone.length !== 12) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const otp = "1234";
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        otp,
        otpExpiresAt: expiresAt,
        isProfileComplete: false,
      });
    } else {
      user.otp = otp;
      user.otpExpiresAt = expiresAt;
      await user.save();
    }

    console.log("DEV OTP SENT:", phone, otp);

    res.json({ success: true });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ message: "OTP send failed" });
  }
});




// VERIFY OTP (DEV MODE)
app.post("/api/verify-otp", async (req, res) => {
  try {
    let { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone or OTP missing" });
    }

    // ✅ Normalize phone
    phone = phone.replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    if (phone.length !== 12) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

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

    // 🔐 Issue JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    // 🧹 Clear OTP
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({
      token,
      isProfileComplete: user.isProfileComplete,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------
// CREATE / UPDATE USER PROFILE
// ---------------------
app.put("/api/profile", protect, async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      clinicName,
      accountType, // "clinic" | "individual"
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Update allowed fields only
    if (name) user.name = name;
    if (email) user.email = email;
    if (address) user.address = address;

    if (accountType) {
      user.accountType = accountType;

      // 🏥 Only clinic users have clinicName
      if (accountType === "clinic") {
        user.clinicName = clinicName || "";
      } else {
        user.clinicName = "";
      }
    }

    // ✅ Mark profile complete
    user.isProfileComplete = true;

    await user.save();

    res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        clinicName: user.clinicName,
        isProfileComplete: user.isProfileComplete,
      },
    });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to create account" });
  }
});

// ---------------------
// FETCH USER PROFILE
// ---------------------
app.get("/api/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-otp -otpExpiresAt -stateId"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      address: user.address,
      accountType: user.accountType,
      clinicName: user.clinicName,
      isProfileComplete: user.isProfileComplete,
      role: user.role,
    });
  } catch (err) {
    console.error("FETCH PROFILE ERROR:", err);
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
        !["1st", "2nd", "3rd", "4th", "Annual", "Custom"].includes(req.body.vaccineInfo.stage)
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
          date: animal.dewormingInfo.nextDewormingDate,
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
app.get("/api/animals/:id", protect, async (req, res) => {
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
app.delete("/api/animals/:id", protect, async (req, res) => {
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
app.delete("/api/animals/:animalId/vaccine-history/:historyIndex", protect, async (req, res) => {
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
// NOTIFICATIONS: TODAY | TOMORROW (1-DAY BEFORE) | 7TH DAY
// ---------------------
app.get("/api/notifications", protect, async (req, res) => {
  try {
    // Normalize helper (remove time)
    const normalize = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const today = normalize(getISTDate());

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const seventhDay = new Date(today);
    seventhDay.setDate(today.getDate() + 7);

    // Fetch animals
    const animals = await Animal.find({ user: req.user.id })
      .populate("ownerId", "name phone");

    const notifications = {
      today: [],
      tomorrow: [],   // ✅ renamed
      seventhDay: [],
    };

    animals.forEach((animal) => {

      // =================
      // 💉 VACCINE
      // =================
      if (
        animal.vaccineInfo?.nextVaccineDate &&
        animal.vaccineInfo.vaccineStatus === "pending"
      ) {
        const dueDate = normalize(animal.vaccineInfo.nextVaccineDate);

        const payload = {
          _id: `${animal._id}-vaccine`,
          type: "vaccine",
          dueDate,
          animalId: animal._id,
          animalName: animal.name,
          species: animal.species,
          ownerId: animal.ownerId?._id,
          ownerName: animal.ownerId?.name || "Pet Owner",
          ownerPhone: animal.ownerId?.phone || "",
        };

        if (dueDate.getTime() === today.getTime()) {
          notifications.today.push(payload);
        }

        // 🔔 1-day before reminder
        if (dueDate.getTime() === tomorrow.getTime()) {
          notifications.tomorrow.push(payload);
        }

        if (dueDate.getTime() === seventhDay.getTime()) {
          notifications.seventhDay.push(payload);
        }
      }

      // =================
      // 🪱 DEWORMING
      // =================
      if (
        animal.dewormingInfo?.nextDewormingDate &&
        animal.dewormingInfo.dewormingStatus === "pending"
      ) {
        const dueDate = normalize(animal.dewormingInfo.nextDewormingDate);

        const payload = {
          _id: `${animal._id}-deworming`,
          type: "deworming",
          dueDate,
          animalId: animal._id,
          animalName: animal.name,
          species: animal.species,
          ownerId: animal.ownerId?._id,
          ownerName: animal.ownerId?.name || "Pet Owner",
          ownerPhone: animal.ownerId?.phone || "",
        };

        if (dueDate.getTime() === today.getTime()) {
          notifications.today.push(payload);
        }

        // 🔔 1-day before reminder
        if (dueDate.getTime() === tomorrow.getTime()) {
          notifications.tomorrow.push(payload);
        }

        if (dueDate.getTime() === seventhDay.getTime()) {
          notifications.seventhDay.push(payload);
        }
      }
    });

    res.json(notifications);
  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});






// ---------------------
// MISSED MESSAGES (3rd day only)
// ---------------------
app.get("/api/notifications/missed", protect, async (req, res) => {
  try {
    const now = getISTDate();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const animals = await Animal.find({ user: req.user.id })
      .populate("ownerId", "name phone");

    const missed = [];

    for (const animal of animals) {

      /* =================
         💉 VACCINE MISSED
         ================= */
      if (
        animal.vaccineInfo?.nextVaccineDate &&
        animal.vaccineInfo.vaccineStatus === "pending"
      ) {
        const dueDate = new Date(animal.vaccineInfo.nextVaccineDate);

        const thirdDay = new Date(dueDate);
        thirdDay.setDate(thirdDay.getDate() + 3);

        if (todayStart >= startOfDay(thirdDay) && todayStart <= endOfDay(thirdDay)) {

          // ✅ CHECK IF ALREADY RECORDED
          const alreadyMissed = animal.vaccineHistory.some(
            (h) =>
              h.status === "missed" &&
              h.stage === animal.vaccineInfo.stage &&
              h.date?.toDateString() === dueDate.toDateString()
          );

          if (!alreadyMissed) {
            // ✅ SAVE TO HISTORY
            animal.vaccineHistory.push({
              vaccineType: animal.vaccineInfo.vaccineType,
              stage: animal.vaccineInfo.stage,
              status: "missed",
              date: dueDate,
            });

            await animal.save();
          }

          missed.push({
            type: "vaccine",
            animalId: animal._id,
            animalName: animal.name,
            ownerId: animal.ownerId?._id,
            ownerName: animal.ownerId?.name,
            ownerPhone: animal.ownerId?.phone,
            dueDate,
          });
        }
      }

      /* =================
         🪱 DEWORMING MISSED
         ================= */
      if (
        animal.dewormingInfo?.nextDewormingDate &&
        animal.dewormingInfo.dewormingStatus === "pending"
      ) {
        const dueDate = new Date(animal.dewormingInfo.nextDewormingDate);

        const thirdDay = new Date(dueDate);
        thirdDay.setDate(thirdDay.getDate() + 3);

        if (todayStart >= startOfDay(thirdDay) && todayStart <= endOfDay(thirdDay)) {

          const alreadyMissed = animal.dewormingHistory.some(
            (h) =>
              h.status === "missed" &&
              h.date?.toDateString() === dueDate.toDateString()
          );

          if (!alreadyMissed) {
            animal.dewormingHistory.push({
              dewormingName: animal.dewormingInfo.dewormingName,
              status: "missed",
              date: dueDate,
            });

            await animal.save();
          }

          missed.push({
            type: "deworming",
            animalId: animal._id,
            animalName: animal.name,
            ownerId: animal.ownerId?._id,
            ownerName: animal.ownerId?.name,
            ownerPhone: animal.ownerId?.phone,
            dueDate,
          });
        }
      }
    }

    res.json(missed);
  } catch (err) {
    console.error("MISSED ERROR:", err);
    res.status(500).json({ message: "Failed to fetch missed messages" });
  }
});




// ---------------------
// THANK YOU: Due Today (Pending)
// ---------------------
app.get("/api/notifications/thank-you", protect, async (req, res) => {
  try {
    const normalize = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const today = normalize(new Date());

    const animals = await Animal.find({ user: req.user.id })
      .populate("ownerId", "name phone");

    const thanksList = [];

    animals.forEach((animal) => {

      // 💉 Vaccine due today
      if (
        animal.vaccineInfo?.nextVaccineDate &&
        animal.vaccineInfo.vaccineStatus === "pending"
      ) {
        const dueDate = normalize(animal.vaccineInfo.nextVaccineDate);

        if (dueDate.getTime() === today.getTime()) {
          thanksList.push({
            _id: `${animal._id}-vaccine`,
            type: "vaccine",
            dueDate,
            animalId: animal._id,
            animalName: animal.name,
            ownerName: animal.ownerId?.name || "Pet Owner",
            ownerPhone: animal.ownerId?.phone || "",
          });
        }
      }

      // 🪱 Deworming due today
      if (
        animal.dewormingInfo?.nextDewormingDate &&
        animal.dewormingInfo.dewormingStatus === "pending"
      ) {
        const dueDate = normalize(animal.dewormingInfo.nextDewormingDate);

        if (dueDate.getTime() === today.getTime()) {
          thanksList.push({
            _id: `${animal._id}-deworming`,
            type: "deworming",
            dueDate,
            animalId: animal._id,
            animalName: animal.name,
            ownerName: animal.ownerId?.name || "Pet Owner",
            ownerPhone: animal.ownerId?.phone || "",
          });
        }
      }
    });

    res.json(thanksList);

  } catch (err) {
    console.error("THANK YOU ERROR:", err);
    res.status(500).json({ message: "Failed to fetch thank you list" });
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
app.get("/api/notify/whatsapp-template", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("whatsappTemplate");
    res.json({ templateId: user.whatsappTemplate });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});


app.post("/api/notify/build-whatsapp-message", protect, async (req, res) => {
  try {
    const { reminder } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Select template (fallback safe)
    const template =
      messageTemplates[user.whatsappTemplate] ||
      messageTemplates.FRIENDLY_V1;

    if (!template) {
      return res.status(400).json({ message: "Template not selected" });
    }

    // ===========================
    // 🔥 Decide Sender Name
    // ===========================
    const senderName =
      user.accountType === "doctor"
        ? `Dr. ${user.name || ""}`
        : user.clinicName || "";

    // ===========================
    // 🔥 Decide Activity Type
    // ===========================
    const activityType =
  String(reminder.type || "")
    .trim()
    .toLowerCase() === "deworming"
    ? "Deworming"
    : "Vaccination";

    // ===========================
    // 🔥 Decide Pet Emoji
    // ===========================
    const petEmoji =
      reminder.species === "dog"
        ? "🐶"
        : reminder.species === "cat"
          ? "🐱"
          : "🐾";

    // ===========================
    // ✅ Build Message Properly
    // ===========================
    let message = template.body
      .replace(/{{ownerName}}/g, reminder.ownerName || "Pet Owner")
      .replace(/{{petName}}/g, reminder.petName || "your pet")
      .replace(/{{petEmoji}}/g, petEmoji)
      .replace(/{{activityType}}/g, activityType)
      .replace(/{{dueDate}}/g, reminder.dueDate || "")
      .replace(/{{contact}}/g, user.phone || "")
      .replace(/{{senderName}}/g, senderName);

    res.json({ message });

  } catch (err) {
    console.error("BUILD WHATSAPP MESSAGE ERROR:", err);
    res.status(500).json({ message: "Failed to build message" });
  }
});






// ---------------------
// SEND WHATSAPP + COMPLETE VISIT
// ---------------------
app.post(
  "/api/notifications/send-whatsapp/:animalId",
  protect,
  async (req, res) => {
    try {
      const { type } = req.body; // "vaccine" | "deworming"
      let updated = false;

      // ✅ VALIDATION
      if (!type || !["vaccine", "deworming"].includes(type)) {
        return res.status(400).json({
          message: "Type is required (vaccine | deworming)",
        });
      }

      const animal = await Animal.findOne({
        _id: req.params.animalId,
        user: req.user.id,
      }).populate("ownerId", "name phone");

      if (!animal) {
        return res.status(404).json({ message: "Animal not found" });
      }

      if (!animal.ownerId) {
        return res.status(400).json({
          message: "Animal missing owner",
        });
      }

      const today = getISTDate();

      // -----------------
      // 💉 VACCINE
      // -----------------
      if (type === "vaccine") {
        if (!animal.vaccineInfo) {
          return res.status(400).json({
            message: "Vaccine info not found",
          });
        }

        // Prevent double-complete
        if (animal.vaccineInfo.vaccineStatus === "completed") {
          return res.json({
            success: true,
            message: "Vaccine already completed",
          });
        }

        animal.vaccineHistory.push({
          vaccineType: animal.vaccineInfo.vaccineType,
          stage: animal.vaccineInfo.stage || "",
          status: "completed",
          date: today,
        });

        animal.vaccineInfo.vaccineStatus = "completed";
        animal.vaccineInfo.lastVaccineDate = today;

        updated = true;
      }

      // -----------------
      // 🪱 DEWORMING
      // -----------------
      if (type === "deworming") {
        if (!animal.dewormingInfo) {
          return res.status(400).json({
            message: "Deworming info not found",
          });
        }

        // Prevent double-complete
        if (animal.dewormingInfo.dewormingStatus === "completed") {
          return res.json({
            success: true,
            message: "Deworming already completed",
          });
        }

        animal.dewormingHistory.push({
          dewormingName: animal.dewormingInfo.dewormingName,
          date: today,
        });

        animal.dewormingInfo.dewormingStatus = "completed";
        animal.dewormingInfo.lastDewormingDate = today;


        updated = true;
      }

      // ✅ SAFETY CHECK
      if (!updated) {
        return res.status(400).json({
          message: "Nothing was updated",
        });
      }


      await animal.save();

      // ===============================
      // 🔥 STORE IN REMINDER LOG
      // ===============================
      await ReminderLog.create({
        user: req.user.id,
        animalId: animal._id,
        ownerId: animal.ownerId?._id,
        type: type, // vaccine or deworming
        reminderWindow: "today", // you can improve later
        sentAt: new Date(),
        received: false,
        visited: true, // since this route marks visit completed
      });




      res.json({
        success: true,
        message: "Visit marked as completed",
      });
    } catch (err) {
      console.error("🔥 REAL ERROR:", err);
      res.status(500).json({
        message: err.message,
        stack: err.stack,
      });
    }
  }
);




// ---------------------
// SEND THANK YOU
// ---------------------
app.post(
  "/api/notifications/send-thank-you/:animalId",
  protect,
  async (req, res) => {
    try {
      const { type } = req.body;

      const animal = await Animal.findOne({
        _id: req.params.animalId,
        user: req.user.id,
      });

      if (!animal) {
        return res.status(404).json({ message: "Animal not found" });
      }

      if (type === "vaccine" && animal.vaccineInfo) {
        animal.vaccineInfo.thankYouSent = true;
      }

      if (type === "deworming" && animal.dewormingInfo) {
        animal.dewormingInfo.thankYouSent = true;
      }

      await animal.save();

      await ReminderLog.create({
        user: req.user.id,
        animalId: animal._id,
        ownerId: animal.ownerId?._id,
        type: type, // vaccine or deworming 
        reminderWindow: "thankyou",
        sentAt: new Date(),
        received: false,
        visited: true, // since this route marks visit completed
        thankyouSent: true,
        followupSent: false,
      });

      res.status(200).json({
        success: true,
        message: "Thank you sent successfully",
      });
      
    } catch (err) {
      console.error("THANK YOU ERROR:", err);
      res.status(500).json({ message: "Failed to send thank you" });
    }
  }
);



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
// GET OWNER REPORT
// ---------------------
app.get("/api/owners/:ownerId/reports", protect, async (req, res) => {
  try {
    const { ownerId } = req.params;

    const animals = await Animal.find({
      ownerId,
      user: req.user.id,
    });

    let notificationsReceived = 0;
    let notificationsMissed = 0;
    let clinicVisits = 0;

    animals.forEach((animal) => {
      // 💉 Vaccine history
      animal.vaccineHistory.forEach((v) => {
        if (v.status === "completed") notificationsReceived++;
        if (v.status === "missed") notificationsMissed++;
      });

      // 🪱 Deworming history
      animal.dewormingHistory.forEach((d) => {
        if (d.status === "completed") notificationsReceived++;
        if (d.status === "missed") notificationsMissed++;
      });

      // 🏥 Visit logic = thank you sent
      if (animal.vaccineInfo?.thankYouSent) clinicVisits++;
      if (animal.dewormingInfo?.thankYouSent) clinicVisits++;
    });

    res.json({
      notificationsReceived,
      notificationsMissed,
      clinicVisits,
    });
  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
});






// ---------------------
app.listen(process.env.PORT || 5001, () =>
  console.log(`Server running`)
);
