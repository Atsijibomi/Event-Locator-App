const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

router.post("/register", userController.register);
router.post("/login", userController.login);

router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Welcome to your profile!", user: req.user });
});

module.exports = router;
