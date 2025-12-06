const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // Check header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "vinay_super_secret"
      );

      console.log("DECODED:", decoded);

      // Attach user to request
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      return next(); // IMPORTANT — stops middleware here

    } catch (err) {
      console.log("JWT ERROR:", err);
      return res.status(401).json({ message: "Token validation failed" });
    }
  }

  // If no token was found
  return res.status(401).json({ message: "No token provided" });
};

module.exports = { protect };
