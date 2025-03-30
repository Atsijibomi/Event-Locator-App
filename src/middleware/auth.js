const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (process.env.NODE_ENV !== "test") {
      const activityQuery = `
        INSERT INTO user_activity (user_id, action, timestamp)
        VALUES ($1, $2, NOW())
      `;
      await db.query(activityQuery, [decoded.id, "accessed_protected_route"]);
    }
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
