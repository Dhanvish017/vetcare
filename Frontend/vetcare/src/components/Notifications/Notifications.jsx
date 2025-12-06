import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Notifications.css";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const res = await axios.get("https://vetcare-1.onrender.com/api/reminders/today");
        setAnimals(res.data || []);
      } catch (err) {
        console.error("Reminder fetch error:", err);
        setError("Failed to load reminders");
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  // format phone into WhatsApp format
  const formatPhone = (raw) => {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, ""); // remove spaces, -, etc.

    // if only 10 digits, assume Indian number
    if (digits.length === 10) return "91" + digits;
    return digits; // already has country code
  };

  const openWhatsApp = (animal) => {
    const phone = formatPhone(animal.owner?.phone);
    if (!phone) {
      alert("No valid phone number for this owner");
      return;
    }

    const msg = `Hi ${animal.owner?.name || "Sir/Madam"},\n\n` +
      `This is a reminder from VetCare.\n` +
      `Your pet *${animal.name}* is scheduled for *${animal.vaccineInfo?.vaccineType || "a vaccine"}* today.\n\n` +
      `Please visit the clinic or contact us for details.\n\n` +
      `- VetCare`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  if (loading) return <div className="notif-loading">Loading reminders...</div>;
  if (error) return <div className="notif-error">{error}</div>;

  return (
    <div className="notif-page">
      <header className="notif-header">
        <div>
          <h1>Today&apos;s Vaccination Reminders</h1>
          <p className="notif-subtitle">
            Animals that have a vaccine scheduled <strong>today</strong>.
          </p>
        </div>
        <button className="notif-back-btn" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
      </header>

      {animals.length === 0 ? (
        <div className="notif-empty">
          🎉 No vaccinations scheduled for today.
        </div>
      ) : (
        <div className="notif-list">
          {animals.map((animal) => (
            <div key={animal._id} className="notif-card">
              <div className="notif-main">
                <div>
                  <h2>{animal.name}</h2>
                  <p className="notif-pet">
                    {animal.species} {animal.breed && `• ${animal.breed}`}{" "}
                    {animal.age ? `• ${animal.age} yrs` : ""}
                  </p>

                  <p className="notif-owner">
                    👤 {animal.owner?.name || "Unknown owner"}
                  </p>
                  <p className="notif-phone">
                    📞 {animal.owner?.phone || "No phone saved"}
                  </p>
                </div>

                <div className="notif-vaccine">
                  <span className="notif-chip">
                    {animal.vaccineInfo?.vaccineType || "Vaccine"}
                  </span>
                  <span className="notif-date">
                    {animal.vaccineInfo?.vaccineDate
                      ? new Date(animal.vaccineInfo.vaccineDate).toLocaleDateString()
                      : "No date"}
                  </span>
                </div>
              </div>

              <div className="notif-actions">
                <button
                  className="notif-whatsapp-btn"
                  onClick={() => openWhatsApp(animal)}
                >
                  💬 Open WhatsApp
                </button>
                <button
                  className="notif-details-btn"
                  onClick={() => navigate(`/animal/${animal._id}`)}
                >
                  View Full Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;

