import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AnimalDetails.css';

const AnimalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  //  DELETE HISTORY FUNCTION (must be here)
  const handleDeleteHistory = async (index) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const res = await axios.delete(
        `http://localhost:5001/api/animals/${id}/vaccine-history/${index}`
      );

      setAnimal(res.data); // update UI
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete entry");
    }
  };

  // FETCH ANIMAL DETAILS
  useEffect(() => {
    const fetchAnimalDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/animals/${id}`);
        setAnimal(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching animal details:', err);
        setError('Failed to load animal details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnimalDetails();
  }, [id]);

  if (isLoading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!animal) return <div className="not-found">Animal not found</div>;

  const v = animal.vaccineInfo || {};

  return (
    <div className="animal-details">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back to Dashboard
      </button>

      <div className="details-card">
        <h1>{animal.name}</h1>

        {/* BASIC DETAILS */}
        <div className="details-grid">
          <div className="detail-item"><span className="detail-label">Species:</span> {animal.species}</div>
          <div className="detail-item"><span className="detail-label">Breed:</span> {animal.breed}</div>
          <div className="detail-item"><span className="detail-label">microchipNumber:</span> {animal.microchipNumber}</div>
          <div className="detail-item"><span className="detail-label">registeredClubName:</span> {animal.registeredClubName}</div>
          <div className="detail-item"><span className="detail-label">clubRegistrationNumber:</span> {animal.clubRegistrationNumber}</div>
          <div className="detail-item"><span className="detail-label">Age:</span> {animal.age} years</div>
          <div className="detail-item"><span className="detail-label">Gender:</span> {animal.gender}</div>
        </div>

        {/* OWNER DETAILS */}
        <h2 className="section-title">Owner Information</h2>
        <div className="details-grid">
          <div className="detail-item"><span className="detail-label">Owner Name:</span> {animal.owner?.name}</div>
          <div className="detail-item"><span className="detail-label">Email:</span> {animal.owner?.email}</div>
          <div className="detail-item"><span className="detail-label">Phone:</span> {animal.owner?.phone}</div>
          <div className="detail-item full-width"><span className="detail-label">Address:</span> {animal.owner?.address}</div>
        </div>

        {/* NEXT VACCINE */}
        <h2 className="section-title">Next Vaccine Information</h2>
        <div className="details-grid">
          <div className="detail-item"><b>Type:</b> {v.vaccineType || "Not Set"}</div>
          <div className="detail-item"><b>Brand:</b> {v.vaccineBrand || "Not Set"}</div>
          <div className="detail-item"><b>Status:</b> {v.vaccineStatus || "Not Set"}</div>
          <div className="detail-item"><b>Date:</b> {v.vaccineDate ? new Date(v.vaccineDate).toLocaleDateString() : "Not Set"}</div>
        </div>

        {/* VACCINE HISTORY */}
        <h2 className="section-title">Vaccine History</h2>

        {animal.vaccineHistory?.length === 0 ? (
          <p>No vaccines administered yet.</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Brand</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {animal.vaccineHistory.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.vaccineType}</td>
                  <td>{entry.vaccineBrand}</td>
                  <td>{entry.status}</td>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDeleteHistory(index)}>
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
};

export default AnimalDetails;


