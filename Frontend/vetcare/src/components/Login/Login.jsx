import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import axios from 'axios';


  const Login = ({ onLogin }) => {
    const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

 try {
  localStorage.removeItem("token");
  const res = await axios.post("http://localhost:5001/login", {
    email: formData.email,
    password: formData.password
  });

  console.log("LOGIN RESPONSE:", res.data);

  if (res.data.token) {
    localStorage.setItem("token", res.data.token);
    onLogin();
    navigate("/dashboard");
  } else {
    setError(res.data.message || "Login failed");
  }

} catch (err) {
  setError(err.response?.data?.message || "Login failed");
}

  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>VetCare Login</h2>
        <form onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button">
            Login
          </button>
          <p className="signup-link">
            Don't have an account? <Link to="/signup">Signup</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
