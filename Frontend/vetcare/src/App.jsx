import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import Signup from './components/Login/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import EditProfile from './components/Profile/EditProfile';
import AddAnimal from './components/AddAnimal/AddAnimal';
import EditAnimal from './components/Dashboard/EditAnimal';
import AnimalDetails from './components/Dashboard/AnimalDetails';
import Notification from './components/Notifications/Notifications';

import './App.css';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check if user is authenticated on initial load
  useEffect(() => {
  const token = localStorage.getItem('token');

  if (token) {
    setIsAuthenticated(true);
  } else {
    // allow login & signup
    const publicRoutes = ["/login", "/signup"];
    if (!publicRoutes.includes(window.location.pathname)) {
      navigate("/login");
    }
  }
}, [navigate]);

  // Handle successful login
  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/login');
  };


  return (
    <div className="app">
      <Routes>

  {/* Always start with login if not authenticated */}
  <Route 
    path="/" 
    element={
      isAuthenticated 
        ? <Navigate to="/dashboard" /> 
        : <Navigate to="/login" />
    }
  />

  {/* LOGIN */}
  <Route 
    path="/login" 
    element={
      isAuthenticated 
        ? <Navigate to="/dashboard" />
        : <Login onLogin={handleLogin} />
    }
  />

  {/* SIGNUP */}
  <Route 
    path="/signup" 
    element={
      isAuthenticated 
        ? <Navigate to="/dashboard" />
        : <Signup onLogin={handleLogin} />
    }
  />

  {/* DASHBOARD */}
  <Route 
    path="/dashboard" 
    element={
      isAuthenticated 
        ? <Dashboard onLogout={handleLogout} />
        : <Navigate to="/login" />
    }
  />

  {/* PROFILE PAGE */}
  <Route 
    path="/profile" 
    element={
      isAuthenticated 
        ? <Profile onLogout={handleLogout} />
        : <Navigate to="/login" />
    }
  />

  {/* EDIT PROFILE */}
  <Route 
    path="/profile/edit" 
    element={
      isAuthenticated 
        ? <EditProfile onLogout={handleLogout} />
        : <Navigate to="/login" />
    }
  />

  {/* ADD ANIMAL */}
  <Route 
    path="/add-animal" 
    element={
      isAuthenticated 
        ? <AddAnimal onLogout={handleLogout} />
        : <Navigate to="/login" />
    }
  />

  {/* EDIT ANIMAL */}
  <Route 
    path="/edit-animal/:id" 
    element={
      isAuthenticated 
        ? <EditAnimal onLogout={handleLogout} />
        : <Navigate to="/login" />
    }
  />

  {/* ANIMAL DETAILS */}
  <Route 
    path="/animals/:id" 
    element={
      isAuthenticated 
        ? <AnimalDetails onLogout={handleLogout} />
        : <Navigate to="/login" />
    }
  />

{/*notification route*/}
  <Route  
  path="/Notifications"
  element={
    isAuthenticated
      ? <Notification />
      : <Navigate to="/login" />
  }
/>




</Routes>

    </div>
  );
}

export default App;
