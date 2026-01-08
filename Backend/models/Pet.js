const mongoose = require("mongoose");

const animalSchema = new mongoose.Schema(
  {
    //USER (MULTI-TENANCY)
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
      type: Number, // derived from DOB (years)
    },

    gender: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
    },

    // 👤 OWNER INFO
    owner: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    /* =========================
       💉 VACCINE ACTIVITY
       ========================= */
    vaccineInfo: {
      presentVaccineType: {
        type: String, // previously given vaccine
        trim: true,
      },

      vaccineType: {
        type: String, // DHHPPi+RL, Tricat, Rabies, etc.
        trim: true,
      },

      stage: {
        type: String,
        enum: ["Primary", "Booster", "2nd Booster", "Annual"],
      },

      vaccineStatus: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
      },

      vaccineDate: {
        type: Date, // calculated from daysUntilNext
      },

      nextVaccineDate: {
        type: Date,
      },
    },

    /* =========================
       🪱 DEWORMING ACTIVITY
       ========================= */
    dewormingInfo: {
      presentDewormingName: {
        type: String,
        trim: true,
      },

      dewormingName: {
        type: String, // Pyrantel pamate, Fenbendazole, custom
        trim: true,
      },

      nextDewormingDate: {
        type: Date,
      },
    },

    /* =========================
       ❤️ REGULAR HEALTH CHECKUP
       ========================= */
    healthCheckupInfo: {
      lastCheckupDate: {
        type: Date,
      },

      nextCheckupDate: {
        type: Date,
      },
    },

    /* =========================
       📜 ACTIVITY HISTORY
       ========================= */

    vaccineHistory: [
      {
        vaccineType: String,
        stage: String,
        status: String,
        date: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    dewormingHistory: [
      {
        dewormingName: String,
        date: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    healthCheckupHistory: [
      {
        date: Date,
        notes: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Animal", animalSchema);



