const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      trim: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    animals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Animal",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Owner", ownerSchema);

