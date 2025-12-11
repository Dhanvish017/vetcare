import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './EditAnimal.css';

const EditAnimal = () => {
  const { id } = useParams();
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
    vaccineBrand: '',
    vaccineStatus: '',
    vaccineDate: ''
  });

  // Fetch existing animal data
  useEffect(() => {
    const fetchAnimal = async () => {
      try {
        const res = await axios.get(
  `https://vetcare-1.onrender.com/api/animals/${id}`,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  }
);

        const a = res.data;

        setFormData({
          animalName: a.name || "",
          species: a.species || "",
          breed: a.breed || "",
          age: a.age || "",
          gender: a.gender || "",
          microchipNumber: a.microchipNumber || "",
          registeredClubName: a.registeredClubName || "",
          clubRegistrationNumber: a.clubRegistrationNumber || "",
          ownerName: a.owner?.name || "",
          ownerEmail: a.owner?.email || "",
          ownerPhone: a.owner?.phone || "",
          address: a.owner?.address || "",

          // vaccine info
          vaccineType: a.vaccineInfo?.vaccineType || "",
          vaccineBrand: a.vaccineInfo?.vaccineBrand || "",
          vaccineStatus: a.vaccineInfo?.vaccineStatus || "",
          vaccineDate: a.vaccineInfo?.vaccineDate
            ? a.vaccineInfo.vaccineDate.split("T")[0]
            : ""
        });
      } catch (err) {
        console.error("Error loading animal:", err);
        alert("Failed to load animal data");
        navigate("/dashboard");
      }
    };

    fetchAnimal();
  }, [id, navigate]);

  // Change handler
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const vaccineOptions = {
    dog: ["DHHPPi+RL", "DHPPi+L", "Puppy DP", "Antirabies"],
    cat: ["Tricat+rabies Vaccine", "Tricat Vacc", "Rabies"],
  };

  const vaccineList = vaccineOptions[formData.species] || [];

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const updated = {
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
        vaccineInfo: {
          type: formData.vaccineType,
          brand: formData.vaccineBrand,
          status: formData.vaccineStatus,
          date: formData.vaccineDate
        }
      };

     await axios.put(
  `https://vetcare-1.onrender.com/api/animals/${id}`,
  updated,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  }
);


      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating animal:", error);
      alert("Failed to update animal.");
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Edit Animal</h1>
        <div className="header-buttons">
          <button className="back-button" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-card">
          <h2>Edit Animal & Owner Details</h2>

          <form onSubmit={handleSubmit} className="animal-form">

            {/* ANIMAL SECTION */}
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

              <div className="form-row">
                <div className="form-group">
                  <label>Species*</label>
                  <select name="species" value={formData.species} onChange={handleChange} required>
                    <option value="">Select Species</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Breed</label>
                  <input type="text" name="breed" value={formData.breed} onChange={handleChange} />
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
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
            </div>

            {/* OWNER SECTION */}
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
                  rows="3"
                  value={formData.address}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>

            {/* VACCINE SECTION */}
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
                  <select name="vaccineStatus" value={formData.vaccineStatus} onChange={handleChange}>
                    <option value="">Stage</option>
                    <option value="scheduled">Primary</option>
                    <option value="administered">Booster</option>
                    <option value="due">2nd Booster</option>
                    <option value="overdue">Annual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="vaccineDate"
                    value={formData.vaccineDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* form buttons */}
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={() => navigate('/dashboard')}>
                Cancel
              </button>

              <button type="submit" className="submit-button">
                Update Animal
              </button>
            </div>

          </form>
        </div>
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} VetCare. All rights reserved.
      </footer>
    </div>
  );
};

export default EditAnimal;
