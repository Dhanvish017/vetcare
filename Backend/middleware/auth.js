const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "vinay_super_secret"
      );

      console.log("DECODED:", decoded);

      // 🔄 Fetch user from PostgreSQL
      const result = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [decoded.id]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // attach user
      req.user = user;

      return next();

    } catch (err) {
      console.log("JWT ERROR:", err);
      return res.status(401).json({ message: "Token validation failed" });
    }
  }

  return res.status(401).json({ message: "No token provided" });
};

module.exports = { protect };