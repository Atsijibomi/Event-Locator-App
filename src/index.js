const express = require("express");
const db = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const eventRoutes = require("./routes/eventRoutes");
const { i18next, middleware } = require("./config/i18n");
require("./scheduler/notificationScheduler");
require("dotenv").config();

const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(middleware.handle(i18next));
  console.log("i18n middleware initialized");

  // Routes
  app.get("/", (req, res) => {
    console.log("GET / hit, language:", req.i18n.language);
    res.send(req.t("welcome"));
  });

  app.get("/db-test", async (req, res) => {
    try {
      const result = await db.query("SELECT NOW()");
      res.json({ message: "Database connected!", time: result.rows[0].now });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/api/users", userRoutes);
  app.use("/api/events", eventRoutes);

  return app;
};

if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { createApp };
