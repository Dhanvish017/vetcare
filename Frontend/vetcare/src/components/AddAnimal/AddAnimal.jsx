import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AddAnimal.css';

const AddAnimal = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    animalName: '',
    species: '',
    breed: '',
    age: '',
    gender: '',
    microchipNumber: '',
    registeredClubName: '',
    clubRegistrationNumber: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    address: '',
    vaccineType: '',
    deworming: '',
    vaccineStatus: '',
    vaccineDate: ''
  });


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDaysChange = (e) => {
    const days = e.target.value;

    setFormData(prev => {
      let nextDate = "";
      if (days) {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(days));
        nextDate = date.toISOString().split("T")[0];
      }

      return {
        ...prev,
        daysUntilNext: days,
        vaccineDate: nextDate
      };
    });
  };

  const vaccineOptions = {
    dog: ["DHHPPi+RL", "DHPPi+L", "Puppy DP", "Antirabies"],
    cat: ["Tricat+rabies Vaccine", "Tricat Vacc", "Rabies"],
  };

  const vaccineList = vaccineOptions[formData.species] || [];


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {

      //  FIXED BODY – MATCHES BACKEND EXACTLY
      const animalData = {
        name: formData.animalName,
        species: formData.species,
        breed: formData.breed,
        age: formData.age ? parseInt(formData.age) : 0,
        gender: formData.gender,
        microchipNumber: formData.microchipNumber,
        registeredClubName: formData.registeredClubName,
        clubRegistrationNumber: formData.clubRegistrationNumber,

        owner: {
          name: formData.ownerName,
          email: formData.ownerEmail,
          phone: formData.ownerPhone,
          address: formData.address
        },

        // SEND THESE FIELDS EXACTLY AS BACKEND EXPECTS
        vaccineType: formData.vaccineType,
        deworming: formData.deworming,
        vaccineStatus: formData.vaccineStatus,
        vaccineDate: formData.vaccineDate
      };

       
    //only one user
      await axios.post(
  "https://vetcare-1.onrender.com/api/animals",
  animalData,
  {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  }
);


      navigate('/dashboard');

    } catch (error) {
      console.error("Error saving animal:", error);
      alert("Failed to save animal. Please try again.");
    }
  };

  return (
    <div className="add-animal-container">
      <header className="add-animal-header">
        <h1>Add New Animal</h1>
        <button onClick={() => navigate('/dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </header>

      <main className="add-animal-content">
        <div className="add-animal-card">
          <h2>Animal & Owner Details</h2>

          <form onSubmit={handleSubmit} className="add-animal-form">

            {/* ANIMAL */}
            <div className="form-section">
              <h3>Animal Information</h3>

              <div className="form-group">
                <label>Animal Name*</label>
                <input
                  type="text"
                  name="animalName"
                  value={formData.animalName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Species *</label>
                <div className="select-wrapper">
                  <select
                    id="species"
                    value={formData.species}
                    onChange={handleChange}
                    name="species"
                    required
                  >
                    <option value="">Select Species</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Breed</label>
                  <input
                    type="text"
                    name="breed"
                    value={formData.breed}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Registration Information */}
              <div className="form-row">
                <div className="form-group">
                  <label>Microchip Number</label>
                  <input
                    type="text"
                    name="microchipNumber"
                    value={formData.microchipNumber}
                    onChange={handleChange}
                    placeholder="Enter microchip number"
                  />
                </div>
                <div className="form-group">
                  <label>Registered Club Name</label>
                  <input
                    type="text"
                    name="registeredClubName"
                    value={formData.registeredClubName}
                    onChange={handleChange}
                    placeholder="Enter club name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Club Registration Number</label>
                  <input
                    type="text"
                    name="clubRegistrationNumber"
                    value={formData.clubRegistrationNumber}
                    onChange={handleChange}
                    placeholder="Enter registration number"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
            </div>

            {/* OWNER */}
            <div className="form-section">
              <h3>Owner Information</h3>

              <div className="form-group">
                <label>Owner Name*</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="ownerEmail"
                    value={formData.ownerEmail}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Phone*</label>
                  <input
                    type="tel"
                    name="ownerPhone"
                    value={formData.ownerPhone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                ></textarea>
              </div>
            </div>

            {/* VACCINE */}
            <div className="form-section">
              <h3>Vaccine Information</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Vaccine Type</label>
                  <select
                    name="vaccineType"
                    value={formData.vaccineType}
                    onChange={handleChange}
                    disabled={!formData.species}  // Prevent selecting before choosing species
                  >
                    <option value="">Select Vaccine</option>

                    {vaccineList.map((vaccine, index) => (
                      <option key={index} value={vaccine.toLowerCase()}>
                        {vaccine}
                      </option>
                    ))}
                  </select>

                </div>

                <div className="form-group">
                  <label>Deworming</label>

                  <input
                    list="dewormingOptions"
                    name="deworming"
                    value={formData.deworming}
                    onChange={handleChange}
                    placeholder="Select or type deworming"
                  />

                  <datalist id="dewormingOptions">
                    <option value="Pyrental pamate" />
                    <option value="Fenbendazole" />
                    <option value="Ivermectin oral" />
                  </datalist>
                </div>

              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="vaccineStatus"
                    value={formData.vaccineStatus}
                    onChange={handleChange}
                  >
                    <option value="">Stage</option>
                    <option value="scheduled">Primary</option>
                    <option value="administered">Booster</option>
                    <option value="due">2nd Booster</option>
                    <option value="overdue">Annual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Next Vaccine After (Days)</label>
                  <input
                    type="number"
                    name="daysUntilNext"
                    value={formData.daysUntilNext || ""}
                    onChange={(e) => handleDaysChange(e)}
                    min="1"
                    placeholder="Enter days"
                  />
                </div>

                <div className="form-group">
                  <label>Predicted Next Vaccine Date</label>
                  <input
                    type="date"
                    value={formData.vaccineDate || ""}
                    readOnly
                  />
                </div>

              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" className="submit-button">
                Save Animal
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
};

export default AddAnimal;

