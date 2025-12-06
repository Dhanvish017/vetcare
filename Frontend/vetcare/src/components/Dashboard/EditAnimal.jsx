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
        const res = await axios.get(`http://localhost:5001/api/animals/${id}`);
        const a = res.data;

        setFormData({
          animalName: a.name || "",
          species: a.species || "",
          breed: a.breed || "",
          age: a.age || "",
          gender: a.gender || "",
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

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const updated = {
        name: formData.animalName,
        species: formData.species,
        breed: formData.breed,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        owner: {
          name: formData.ownerName,
          email: formData.ownerEmail,
          phone: formData.ownerPhone,
          address: formData.address
        },

        vaccineType: formData.vaccineType,
        vaccineBrand: formData.vaccineBrand,
        vaccineStatus: formData.vaccineStatus,
        vaccineDate: formData.vaccineDate
      };

      await axios.put(`http://localhost:5001/api/animals/${id}`, updated);

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
                    <option value="bird">Bird</option>
                    <option value="rabbit">Rabbit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Breed</label>
                  <input type="text" name="breed" value={formData.breed} onChange={handleChange} />
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
                  <select name="vaccineType" value={formData.vaccineType} onChange={handleChange}>
                    <option value="">Select Type</option>
                    <option value="rabies">Rabies</option>
                    <option value="distemper">Distemper</option>
                    <option value="parvovirus">Parvovirus</option>
                    <option value="bordetella">Bordetella</option>
                    <option value="leptospirosis">Leptospirosis</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Brand</label>
                  <select name="vaccineBrand" value={formData.vaccineBrand} onChange={handleChange}>
                    <option value="">Select Brand</option>
                    <option value="nobivac">Nobivac</option>
                    <option value="vanguard">Vanguard</option>
                    <option value="defensor">Defensor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select name="vaccineStatus" value={formData.vaccineStatus} onChange={handleChange}>
                    <option value="">Select Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="administered">Administered</option>
                    <option value="due">Due</option>
                    <option value="overdue">Overdue</option>
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
