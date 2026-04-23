const express = require("express");
const router = express.Router();
const pool = require("../config/db"); // ✅ use existing connection

// ─────────────────────────────
// GET /api/report
// ─────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      category = "vaccine",   // vaccine / deworming
      days = 7,               // 7, 30, 0 (all)
      search = "",            // pet name search
      sortField = "date",     // column
      order = "desc",         // asc / desc
    } = req.query;

    // ✅ Base query
    let query = `
      SELECT id, pet_name, owner_name, type, category, date, status
      FROM health_records
      WHERE category = $1
    `;

    const values = [category];
    let index = 2;

    // 📅 Date filter
    if (days !== "0") {
      query += ` AND date >= CURRENT_DATE - INTERVAL '${days} days'`;
    }

    // 🔍 Search (pet name)
    if (search) {
      query += ` AND LOWER(pet_name) LIKE $${index}`;
      values.push(`%${search.toLowerCase()}%`);
      index++;
    }

    // 🔄 Safe sorting
    const allowedFields = [
      "pet_name",
      "owner_name",
      "type",
      "date",
      "status",
    ];

    const field = allowedFields.includes(sortField)
      ? sortField
      : "date";

    const sortOrder = order === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY ${field} ${sortOrder}`;

    // ▶️ Execute query
    const result = await pool.query(query, values);

    // 📊 Stats (important for your UI cards)
    const total = result.rows.length;
    const pending = result.rows.filter(r => r.status === "pending").length;
    const completed = result.rows.filter(r => r.status === "completed").length;

    // 🔁 Format for frontend (match your keys)
    const formattedData = result.rows.map(r => ({
      id: r.id,
      petName: r.pet_name,
      ownerName: r.owner_name,
      type: r.type,
      date: r.date,
      status: r.status,
      category: r.category,
    }));

    res.json({
      data: formattedData,
      stats: {
        total,
        pending,
        completed,
      },
    });

  } catch (err) {
    console.error("Report API Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;