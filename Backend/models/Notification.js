import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // What this notification is about
    category: {
      type: String,
      enum: ["VACCINE", "DEWORMING"],
      required: true,
    },

    // Reference to the original schedule/reminder
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Owner who will receive the message
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },

    // Pet (useful for message personalization)
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Animal",
      required: true,
    },

    // Type of notification
    type: {
      type: String,
      enum: ["UPCOMING", "MISSED", "THANK_YOU"],
      required: true,
    },

    // How the message is sent
    channel: {
      type: String,
      enum: ["WHATSAPP"],
      default: "WHATSAPP",
    },

    // Current state of delivery
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
      index: true,
    },

    // When it should be sent
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },

    // Retry & audit info
    attempts: {
      type: Number,
      default: 0,
    },

    sentAt: Date,
    lastError: String,
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);

