require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ---------------------
// MIDDLEWARE
// ---------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ---------------------
// DATABASE CONNECTION
// ---------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// ---------------------
// BASIC HEALTH CHECK
// ---------------------
app.get("/", (req, res) => {
  res.json({ message: "ZetPetGo API Running" });
});

// ---------------------
// ROUTES
// ---------------------
const authRoutes         = require("./routes/auth");
const profileRoutes      = require("./routes/profile");
const animalRoutes       = require("./routes/animals");
const ownerRoutes        = require("./routes/owners");
const notificationRoutes = require("./routes/notifications");
const whatsappRoutes     = require("./routes/whatsapp");
const dashboardRoutes    = require("./routes/dashboard");
//const notifyRoutes       = require("./routes/notify");       // existing
const analyticRoutes     = require("./routes/analyticsRoutes"); // existing
const templateRoutes     = require("./routes/template");
const reportRoutes       = require("./routes/report");


app.use("/",           authRoutes);          // POST /signup, /api/send-otp, /api/verify-otp
app.use("/api/profile",       profileRoutes);
app.use("/api/animals",       animalRoutes);
app.use("/api/owners",        ownerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notify",        whatsappRoutes);
app.use("/api/dashboard",     dashboardRoutes);
//app.use("/api/notify",        notifyRoutes);      // existing notify routes (keep as-is)
app.use("/api/analytics",     analyticRoutes);    // existing analytics routes (keep as-is)
app.use("/api/template",      templateRoutes);
app.use("/api/report",        reportRoutes);


const pool = require("./config/db");

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("DB Error:", err);
  } else {
    console.log("PostgreSQL Connected:", res.rows);
  }
});

// ---------------------
// START SERVER
// ---------------------
app.listen(process.env.PORT || 5001, () =>
  console.log(`Server running on port ${process.env.PORT || 5001}`)
);