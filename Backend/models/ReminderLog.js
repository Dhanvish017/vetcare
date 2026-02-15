const mongoose = require("mongoose");

const reminderLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Animal",
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },

    type: {
      type: String,
      enum: ["vaccine", "deworming"],
      required: true,
    },

    reminderWindow: {
      type: String,
      enum: ["sevenDay", "oneDay", "today"],
    },

    sent: {
      type: Boolean,
      default: true,
    },

    visited: {
      type: Boolean,
      default: false,
    },

    thankyouSent: {
      type: Boolean,
      default: false,
    },

    followupSent: {
      type: Boolean,
      default: false,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReminderLog", reminderLogSchema);


