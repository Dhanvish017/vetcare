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

    //BASIC INFO
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
      type: Number, // years (derived from DOB)
    },

    gender: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
    },

    // OWNER INFO
    owner: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    // VACCINE INFO (CURRENT / UPCOMING)
    vaccineInfo: {
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
        type: Date,
      },

      nextVaccineDate: {
        type: Date,
      },

      //DEWORMING
      dewormingName: {
        type: String, // Pyrantel pamate, Fenbendazole, custom
        trim: true,
      },

      nextDewormingDate: {
        type: Date,
      },
    },

    // VACCINE HISTORY
    vaccineHistory: [
      {
        vaccineType: String,
        stage: String,
        status: String,
        date: Date,
        dewormingName: String,
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


