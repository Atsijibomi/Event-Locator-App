const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const authMiddleware = require("../middleware/auth");
const db = require("../config/db");

// Language middleware to run after auth
const setLanguage = async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      const result = await db.query(
        "SELECT language FROM profiles WHERE id = $1",
        [req.user.id]
      );
      if (result.rows.length > 0 && result.rows[0].language) {
        req.i18n.changeLanguage(result.rows[0].language);
      }
    } catch (err) {
      console.error("Failed to set language:", err);
    }
  }
  next();
};

router.post("/", authMiddleware, eventController.createEvent);
router.post("/rate", authMiddleware, setLanguage, eventController.rateEvent);
router.get("/", eventController.getAllEvents);
router.get(
  "/search/nearby",
  authMiddleware,
  setLanguage,
  eventController.searchEventsByLocation
);
router.get("/:id", eventController.getEventById);
router.put("/:id", authMiddleware, eventController.updateEvent);
router.delete("/:id", authMiddleware, eventController.deleteEvent);
router.get(
  "/search/nearby",
  authMiddleware,
  setLanguage,
  eventController.searchEventsByLocation
);

module.exports = router;
