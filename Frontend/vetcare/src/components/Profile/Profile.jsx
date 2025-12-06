import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";

const Profile = ({ onLogout }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogoutClick = () => {
    localStorage.removeItem("token");
    onLogout();
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get("http://localhost:5001/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(res.data);
        setLoading(false);     // ✅ FIX #1 — allow page to show
      } catch (err) {
        console.error("Profile fetch error:", err);
        navigate("/login");     // redirect only on 401
      }
    };

    fetchProfile();
  }, [navigate]);

  // Always show safe UI while loading
  if (loading) return <h2>Loading Profile...</h2>;

  // Safety check so your app doesn't crash if backend changes
  if (!user) return <h2>User data not found</h2>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <button onClick={() => navigate('/dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {(user.name || "U").split(" ").map(n => n[0]).join("")}
          </div>
        </div>

        <div className="profile-info">
          <h2>{user.name}</h2>

          <div className="info-section">
            <h3>Contact Information</h3>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Address:</strong> {user.address || "Not added"}</p>
          </div>

          <div className="info-section">
            <h3>About Me</h3>
            <p>{user.bio || "No bio added yet"}</p>
          </div>

          <div className="button-container">
            <button 
              className="edit-button"
              onClick={() => navigate('/profile/edit')}
            >
              Edit Profile
            </button>
            <button
              onClick={handleLogoutClick}
              className="logout-button"
            >
              Logout
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;

