const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { protect } = require("../middleware/auth");

// ---------------------
// CREATE / UPDATE USER PROFILE
// ---------------------
router.put("/", protect, async (req, res) => {
  try {
    const { name, email, address, clinicName, accountType } = req.body;

    // ✅ Use email from Supabase user object
    const supabaseEmail = req.user.email;

    // 🔍 Check if user exists
    let userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [supabaseEmail]
    );

    let user = userRes.rows[0];

    // ➕ Create user if doesn't exist (first time Google/email login)
    if (!user) {
      const newUser = await pool.query(
        `INSERT INTO users (email, is_profile_complete)
         VALUES ($1, false)
         RETURNING *`,
        [supabaseEmail]
      );
      user = newUser.rows[0];
    }

    // 🔄 Update user
    const updated = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        address = COALESCE($3, address),
        account_type = COALESCE($4, account_type),
        clinic_name = CASE 
          WHEN $4 = 'clinic' THEN $5
          WHEN $4 = 'individual' THEN NULL
          ELSE clinic_name
        END,
        is_profile_complete = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE email = $6
      RETURNING *`,
      [name, email, address, accountType, clinicName, supabaseEmail]
    );

    const updatedUser = updated.rows[0];

    res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        email: updatedUser.email,
        accountType: updatedUser.account_type,
        clinicName: updatedUser.clinic_name,
        isProfileComplete: updatedUser.is_profile_complete,
      },
    });

  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to create account" });
  }
});


// ---------------------
// FETCH USER PROFILE
// ---------------------
router.get("/", protect, async (req, res) => {
  try {
    // ✅ Use email from Supabase user object
    const supabaseEmail = req.user.email;

    let result = await pool.query(
      `SELECT id, phone, name, email, address,
              account_type, clinic_name,
              is_profile_complete, role
       FROM users
       WHERE email = $1`,
      [supabaseEmail]
    );

    let user = result.rows[0];

    // ➕ Auto-create user row if first time login
    if (!user) {
      const newUser = await pool.query(
        `INSERT INTO users (email, is_profile_complete)
         VALUES ($1, false)
         RETURNING *`,
        [supabaseEmail]
      );
      user = newUser.rows[0];
    }

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      address: user.address,
      accountType: user.account_type,
      clinicName: user.clinic_name,
      isProfileComplete: user.is_profile_complete,
      role: user.role,
    });

  } catch (err) {
    console.error("FETCH PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

module.exports = router;