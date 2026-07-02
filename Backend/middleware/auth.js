const pool = require("../config/db");
const supabase = require("../config/supabase");

const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = auth.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        message: "Invalid Supabase token",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE supabase_uid = $1",
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    req.user = result.rows[0];

    next();

  } catch (err) {
    console.error(err);

    return res.status(401).json({
      message: "Token validation failed",
    });
  }
};

module.exports = { protect };