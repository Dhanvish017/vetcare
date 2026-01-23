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
    /*owner: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },*/

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
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
        enum: ["1st", "2nd", "3rd", "4th","Annual", "Custom"],
      },
      
      customStage: {
        type: String,
        trim: true,
      },
      
      vaccineStatus: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
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

      dewormingStatus: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
      },

      nextDewormingDate: {
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Animal", animalSchema);



