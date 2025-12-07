import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

const Signup = () => {

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle signup submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      console.log("Signup attempt:", formData);

      // Example API call (you can modify backend route)
     await axios.post(
  "https://vetcare-1.onrender.com/signup",
  {
    name: formData.name,
    email: formData.email,
    password: formData.password,
  },

  {
    headers: {
      "Content-Type": "application/json",
    }
  }

    );
     navigate("/login");        
    alert("Signup successful! please login");
     
      
    } catch (err) {
  console.error("Signup ERROR:", err);
  setError("Signup failed. Try again.");
}

  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h2>Create an Account</h2>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="Create a password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="signup-button">
            Sign Up
          </button>

          <p className="login-link">
            Already have an account? <Link to="/login">Log in</Link>
          </p>

        </form>
      </div>
    </div>
  );
};

export default Signup;

