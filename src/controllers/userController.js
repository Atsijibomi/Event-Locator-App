const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const generateProfileTag = () => {
  const prefixes = ["Explorer", "Wanderer", "Seeker", "Trailblazer"];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomCode = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${randomPrefix}-${randomCode}`;
};

const register = async (req, res) => {
  const {
    email,
    password,
    latitude,
    longitude,
    preferred_radius,
    preferred_categories,
    language,
    notification_preference,
  } = req.body;

  try {
    req.i18n.changeLanguage(language || "en");

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const profileTag = generateProfileTag();
    const user = await User.create({
      email,
      password,
      latitude,
      longitude,
      language: language || "en",
      notification_preference: notification_preference || "email",
      preferred_radius: preferred_radius || 10,
      preferred_categories: preferred_categories || [],
      profile_tag: profileTag, // Add profileTag to the model if needed
    });

    res.status(201).json({ message: req.t("user_registered"), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    req.i18n.changeLanguage(user.language || "en");

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({
      message: req.t("login_success"),
      token,
      profile_tag: user.profile_tag,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

module.exports = { register, login };
