const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },

    species: {
        type: String,
        required: true,
        enum: ['dog', 'cat', 'bird', 'rabbit', 'other']
    },

    breed: String,
    age: Number,

    gender: { 
        type: String, 
        enum: ['male', 'female', 'unknown'] 
    },

    owner: {
        name: String,
        email: String,
        phone: String,
        address: String
    },

    medicalHistory: [{
        date: { type: Date, default: Date.now },
        diagnosis: String,
        treatment: String,
        notes: String,
        veterinarian: String
    }],

    vaccinations: [{
        name: String,
        date: Date,
        nextDue: Date,
        notes: String
    }],

    vaccineInfo: {
  type: {
    vaccineType: String,     // rabies, distemper, etc.
    deworming: String,    // nobivac, vanguard...
    vaccineStatus: String,   // scheduled, administered, due, overdue
    vaccineDate: Date        // chosen date
  },
  default: {}
},

vaccineHistory: [
  {
    vaccineType: String,
    deworming: String,
    status: String,
    date: Date,
    createdAt: { type: Date, default: Date.now }
  }
],


}, { timestamps: true });

module.exports = mongoose.model('Animal', animalSchema);

