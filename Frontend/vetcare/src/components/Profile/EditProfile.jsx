import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import axios from 'axios';

const EditProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null); 
  const [loading, setLoading] = useState(true);

  // STEP 1: Fetch user details from backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get("http://localhost:5001/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setFormData(res.data);     // set real data
        setLoading(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  // Show loader until data arrives
  if (loading || !formData) return <h2>Loading...</h2>;

  // STEP 2: Handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // STEP 3: Submit updated profile
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      await axios.put("http://localhost:5001/profile", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate("/profile");
    } catch (error) {
      console.error("Profile update failed:", error);
      alert("Failed to update profile.");
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Edit Profile</h1>
        <button onClick={() => navigate(-1)} className="back-button">
          Cancel
        </button>
      </div>

      <form className="profile-card edit-form" onSubmit={handleSubmit}>
        <div className="profile-avatar">
          <div className="avatar-circle">
            {formData.name.split(' ').map(n => n[0]).join('')}
          </div>
        </div>

        <div className="profile-info">
          
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Specialization</label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="button-container">
            <button type="submit" className="save-button">
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default EditProfile;

