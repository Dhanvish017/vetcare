const mongoose = require("mongoose");

const animalSchema = new mongoose.Schema(
  {
    // USER (MULTI-TENANCY)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🐾 BASIC ANIMAL INFO
    name: {
      type: String,
      required: true,
      trim: true,
    },

    species: {
      type: String,
      enum: ["dog", "cat"],
      required: true,
    },

    breed: {
      type: String,
      trim: true,
    },

    dob: {
      type: Date,
    },

    age: {
      type: Number,
    },

    gender: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
    },

    // 👤 OWNER INFO
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
    },

    /* =========================
       💉 VACCINE ACTIVITY (V1)
       ========================= */
    vaccineInfo: {
      presentVaccineType: { type: String, trim: true },
      vaccineType:        { type: String, trim: true },
      stage: {
        type: String,
        enum: ["1st", "2nd", "3rd", "4th", "Annual", "Custom"],
      },
      customStage:     { type: String, trim: true },
      vaccineStatus: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
      },
      nextVaccineDate: { type: Date },
      lastVaccineDate: { type: Date },
      thankYouSent:    { type: Boolean, default: false },
    },

    /* =========================
       🪱 DEWORMING ACTIVITY (V1)
       ========================= */
    dewormingInfo: {
      presentDewormingName: { type: String, trim: true },
      dewormingName:        { type: String, trim: true },
      dewormingStatus: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
      },
      nextDewormingDate: { type: Date },
      lastDewormingDate: { type: Date },
      thankYouSent:      { type: Boolean, default: false },
    },

    /* =========================
       📜 ACTIVITY HISTORY (V1)
       ========================= */
    vaccineHistory: [
      {
        vaccineType: String,
        stage:       String,
        status: {
          type: String,
          enum: ["completed", "missed"],
        },
        date:      Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    dewormingHistory: [
      {
        dewormingName: String,
        status: {
          type: String,
          enum: ["completed", "missed"],
        },
        date:      Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    /* =========================
       📅 VACCINE SCHEDULE (V2)
       ========================= */
    vaccineSchedule: [
      {
        stage:       { type: String, trim: true },
        vaccineName: { type: String, trim: true },
        interval:    { type: Number, default: 0 },
        dueDate:     { type: Date },
        status: {
          type: String,
          enum: ["pending", "completed", "missed"],
          default: "pending",
        },
        notes:     { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    /* =========================
       📅 DEWORMING SCHEDULE (V2)
       ========================= */
    dewormingSchedule: [
      {
        dewormingName: { type: String, trim: true },
        interval:      { type: Number, default: 0 },
        dueDate:       { type: Date },
        status: {
          type: String,
          enum: ["pending", "completed", "missed"],
          default: "pending",
        },
        notes:     { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Animal", animalSchema);