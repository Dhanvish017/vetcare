const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const { protect } = require("../middleware/auth");

// ─────────────────────────────
// GET /api/report
// ─────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const {
      category  = "vaccine",
      days      = "7",
      search    = "",
      sortField = "date",
      order     = "desc",
    } = req.query;

    const userId    = req.user.id;
    const daysNum   = parseInt(days) || 0;
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    // Safe sort field mapping
    const fieldMap = {
      petName:   "a.name",
      ownerName: "o.name",
      type:      category === "vaccine" ? "vs.vaccine_name" : "ds.deworming_name",
      date:      category === "vaccine" ? "vs.due_date"     : "ds.due_date",
      status:    category === "vaccine" ? "vs.status"       : "ds.status",
    };
    const sortCol = fieldMap[sortField] || (category === "vaccine" ? "vs.due_date" : "ds.due_date");

    let rows = [];

    if (category === "vaccine") {
      let query = `
        SELECT
          vs.id,
          a.name        AS pet_name,
          a.species,
          o.name        AS owner_name,
          vs.vaccine_name AS type,
          vs.stage,
          vs.due_date   AS date,
          vs.status
        FROM vaccine_schedule vs
        JOIN animals a ON vs.animal_id = a.id
        JOIN owners  o ON a.owner_id   = o.id
        WHERE a.user_id = $1
          AND vs.vaccine_name IS NOT NULL
          AND vs.vaccine_name != ''
      `;
      const values = [userId];
      let idx = 2;

      if (daysNum > 0) {
        query += ` AND vs.due_date >= CURRENT_DATE - INTERVAL '${daysNum} days'`;
      }
      if (search.trim()) {
        query += ` AND (LOWER(a.name) LIKE $${idx} OR LOWER(vs.vaccine_name) LIKE $${idx})`;
        values.push(`%${search.toLowerCase()}%`);
        idx++;
      }

      query += ` ORDER BY ${sortCol} ${sortOrder}`;
      const result = await pool.query(query, values);
      rows = result.rows;

    } else {
      // deworming
      let query = `
        SELECT
          ds.id,
          a.name           AS pet_name,
          a.species,
          o.name           AS owner_name,
          ds.deworming_name AS type,
          ds.due_date      AS date,
          ds.status
        FROM deworming_schedule ds
        JOIN animals a ON ds.animal_id = a.id
        JOIN owners  o ON a.owner_id   = o.id
        WHERE a.user_id = $1
          AND ds.deworming_name IS NOT NULL
          AND ds.deworming_name != ''
      `;
      const values = [userId];
      let idx = 2;

      if (daysNum > 0) {
        query += ` AND ds.due_date >= CURRENT_DATE - INTERVAL '${daysNum} days'`;
      }
      if (search.trim()) {
        query += ` AND (LOWER(a.name) LIKE $${idx} OR LOWER(ds.deworming_name) LIKE $${idx})`;
        values.push(`%${search.toLowerCase()}%`);
        idx++;
      }

      query += ` ORDER BY ${sortCol} ${sortOrder}`;
      const result = await pool.query(query, values);
      rows = result.rows;
    }

    // Stats
    const total     = rows.length;
    const pending   = rows.filter(r => r.status === "pending").length;
    const completed = rows.filter(r => r.status === "completed").length;

    // Format for frontend
    const data = rows.map(r => ({
      id:        r.id,
      petName:   r.pet_name,
      ownerName: r.owner_name,
      species:   r.species,
      type:      r.type,
      stage:     r.stage || null,
      date:      r.date,
      status:    r.status,
    }));

    res.json({ data, stats: { total, pending, completed } });

  } catch (err) {
    console.error("REPORT ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;