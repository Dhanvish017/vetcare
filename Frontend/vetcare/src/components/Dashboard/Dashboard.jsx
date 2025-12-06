import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { FaTrash, FaUser, FaEdit } from 'react-icons/fa';
import axios from 'axios';


const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardCards, setDashboardCards] = useState([]);

  // Default cards that will be shown if no animals are found
  const defaultCards = [
    {
      id: 'welcome',
      title: 'Welcome to VetCare',
      subtitle: 'Hi there!',
      stats: [
        { id: 1, name: 'Animals', count: '0', date: 'Total' },
        { id: 2, name: 'Add your first', count: 'animal', date: 'to begin' }
      ]
    },
    {
      id: 'overview',
      title: 'Practice Overview',
      subtitle: 'Manage your veterinary practice efficiently.',
      stats: [
        { id: 3, name: 'Appointments', count: '0', date: 'Today' },
        { id: 4, name: 'Patients', count: '0', date: 'Total' }
      ]
    }
  ];

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/animals');
      const transformedData = response.data.map(animal => ({
        id: animal._id,
        title: animal.name,
        subtitle: `Breed: ${animal.breed || 'N/A'}`,
        stats: [
          { id: 1, name: 'Species', count: animal.species, date: 'Species' },
          { id: 2, name: 'Age', count: animal.age || 'N/A', date: 'Years' },
          { id: 3, name: 'Gender', count: animal.gender || 'N/A', date: '' }
        ]
      }));
      setDashboardCards(transformedData);
      setError(null);
    } catch (error) {
      console.error('Error fetching animals:', error);
      setError('Failed to load animal data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this animal record?')) {
      try {
        await axios.delete(`http://localhost:5001/api/animals/${cardId}`);
        setDashboardCards(dashboardCards.filter(card => card.id !== cardId));
      } catch (error) {
        console.error('Error deleting animal:', error);
        setError('Failed to delete animal');
      }
    }
  };

  const handleEditCard = (cardId) => {
    navigate(`/edit-animal/${cardId}`);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>VetCare Dashboard</h1>
        <div className="header-buttons">
          <button 
            className="profile-button"
            onClick={() => navigate('/profile')}
            title="View Profile"
          >
            <FaUser />
          </button>
          <button 
            className="add-animal-button"
            onClick={() => navigate('/add-animal')}
          >
            +
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {dashboardCards.length === 0 ? (
          <div className="no-animals-container">
            <div className="no-animals">
              <h2>No animals found</h2>
              <p>Get started by adding your first animal to the system</p>
              <button 
                className="add-first-animal-button"
                onClick={() => navigate('/add-animal')}
              >
                + Add Your First Animal
              </button>
            </div>
          </div>
        ) : (
          dashboardCards.map(card => (
            <div 
              key={card.id} 
              className="dashboard-card"
              onClick={(e) => {
                // Don't navigate if the click was on an action button
                if (!e.target.closest('.card-actions')) {
                  navigate(`/animals/${card.id}`);
                }
              }}
            >
              <div className="card-actions">
                <button 
                  className="edit-card-button"
                  onClick={() => handleEditCard(card.id)}
                  title="Edit this animal"
                >
                  <FaEdit />
                </button>
                <button 
                  className="delete-card-button"
                  onClick={() => handleDeleteCard(card.id)}
                  title="Delete this animal"
                >
                  <FaTrash />
                </button>
              </div>
              <h2>{card.title}</h2>
              <p>{card.subtitle}</p>
              
              <div className="stats-container">
                {card.stats.map(stat => (
                  <div key={stat.id} className="stat-card">
                    <h3>{stat.name}</h3>
                    <p className="stat-number">{stat.count}</p>
                    <p>{stat.date}</p>
                  </div>
                ))}
              </div>

            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default Dashboard;
