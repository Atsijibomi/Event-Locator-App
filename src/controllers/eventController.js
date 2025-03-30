const Event = require("../models/event");
const Rating = require("../models/rating");
const db = require("../config/db");

const generateEventCode = (category, latitude, longitude) => {
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  const latCode = Math.abs(Math.round(latitude)).toString();
  const randomCode = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${categoryPrefix}-${latCode}-${randomCode}`;
};

const rateEvent = async (req, res) => {
  const { event_id, rating } = req.body;
  const user_id = req.user.id;

  if (!event_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      error: req.t("invalid_rating", {
        defaultValue: "Rating must be between 1 and 5",
      }),
    });
  }

  try {
    const eventCheck = await db.query(
      "SELECT id FROM event_nodes WHERE id = $1",
      [event_id]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: req.t("event_not_found") });
    }

    const rated = await Rating.createOrUpdate({ event_id, user_id, rating });
    res.status(201).json({
      message: req.t("rating_submitted", { defaultValue: "Rating submitted" }),
      rating: rated,
    });
  } catch (err) {
    console.error("Rate event error:", err.stack);
    res.status(500).json({
      error: req.t("rating_error", { defaultValue: "Failed to submit rating" }),
      details: err.message,
    });
  }
};

const createEvent = async (req, res) => {
  const { title, description, latitude, longitude, event_time, categories } =
    req.body;
  const creator_id = req.user.id;

  try {
    const eventCode = generateEventCode(
      categories[0] || "GEN",
      latitude,
      longitude
    );
    const event = await Event.create({
      title,
      description,
      latitude,
      longitude,
      event_time,
      categories: categories || [],
      creator_id,
      event_code: eventCode, // Add event_code to model if needed
    });
    res.status(201).json({ message: req.t("event_created"), event });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: req.t("event_created_failed", {
        defaultValue: "Failed to create event",
      }),
    });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, event_code, title, description, 
              ST_X(ST_AsText(location)) AS longitude, 
              ST_Y(ST_AsText(location)) AS latitude, 
              event_time, categories, creator_id 
       FROM event_nodes`
    );
    res.json({ events: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: req.t("search_error", {
        defaultValue: "Failed to fetch events",
      }),
    });
  }
};

const getEventById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT id, event_code, title, description, 
              ST_X(ST_AsText(location)) AS longitude, 
              ST_Y(ST_AsText(location)) AS latitude, 
              event_time, categories, creator_id 
       FROM event_nodes WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: req.t("event_not_found") });
    }
    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: req.t("search_error", { defaultValue: "Failed to fetch event" }),
    });
  }
};

const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { title, description, latitude, longitude, event_time, categories } =
    req.body;
  const creator_id = req.user.id;

  try {
    const check = await db.query(
      "SELECT creator_id FROM event_nodes WHERE id = $1",
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: req.t("event_not_found") });
    }
    if (check.rows[0].creator_id !== creator_id) {
      return res.status(403).json({ error: req.t("unauthorized") });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (latitude !== undefined && longitude !== undefined) {
      updates.push(`location = ST_GeogFromText($${paramCount++})`);
      values.push(`POINT(${longitude} ${latitude})`);
    }
    if (event_time !== undefined) {
      updates.push(`event_time = $${paramCount++}`);
      values.push(event_time);
    }
    if (categories !== undefined) {
      updates.push(`categories = $${paramCount++}`);
      values.push(categories);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: req.t("no_fields") });
    }

    values.push(id);
    const query = `
      UPDATE event_nodes
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, event_code, title
    `;

    const result = await db.query(query, values);
    res.json({ message: req.t("event_updated"), event: result.rows[0] });
  } catch (err) {
    console.error("Update event error:", err.stack);
    res.status(500).json({
      error: req.t("event_updated_failed", {
        defaultValue: "Failed to update event",
      }),
      details: err.message,
    });
  }
};

const deleteEvent = async (req, res) => {
  const { id } = req.params;
  const creator_id = req.user.id;

  try {
    const check = await db.query(
      "SELECT creator_id FROM event_nodes WHERE id = $1",
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: req.t("event_not_found") });
    }
    if (check.rows[0].creator_id !== creator_id) {
      return res.status(403).json({ error: req.t("unauthorized") });
    }

    await db.query("DELETE FROM event_nodes WHERE id = $1", [id]);
    res.json({ message: req.t("event_deleted") });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: req.t("event_deleted_failed", {
        defaultValue: "Failed to delete event",
      }),
    });
  }
};

const searchEventsByLocation = async (req, res) => {
  const { latitude, longitude, radius, categories } = req.query;

  console.log("searchEventsByLocation called, language:", req.i18n.language);

  if (!latitude || !longitude || !radius) {
    return res.status(400).json({ error: req.t("required_fields") });
  }

  try {
    const categoryArray = categories
      ? categories.split(",").map((cat) => cat.trim())
      : null;

    let query = `
      SELECT 
        e.id, 
        e.event_code, 
        e.title, 
        e.description,
        ST_X(ST_AsText(e.location)) AS longitude,
        ST_Y(ST_AsText(e.location)) AS latitude,
        e.event_time, 
        e.categories, 
        e.creator_id,
        ST_Distance(e.location, ST_GeogFromText($1)) / 1000 AS distance_km,
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(r.rating) AS rating_count
      FROM event_nodes e
      LEFT JOIN event_ratings r ON e.id = r.event_id
    `;
    const values = [`POINT(${longitude} ${latitude})`, radius];

    if (categoryArray && categoryArray.length > 0) {
      query += `
        WHERE ST_DWithin(e.location, ST_GeogFromText($1), $2 * 1000)
        AND e.categories && $3::text[]
      `;
      values.push(`{${categoryArray.join(",")}}`);
    } else {
      query += `
        WHERE ST_DWithin(e.location, ST_GeogFromText($1), $2 * 1000)
      `;
    }

    query += `
      GROUP BY e.id
      ORDER BY distance_km ASC
    `;

    const result = await db.query(query, values);
    const events = result.rows.map((event) => {
      const titleLower = event.title.toLowerCase();
      let translatedTitle = event.title;
      if (titleLower.includes("concert")) {
        translatedTitle = req.t("titles.concert", { defaultValue: "Concert" });
        if (titleLower.includes("updated")) {
          translatedTitle = `${req.t("titles.updated", {
            defaultValue: "Updated",
          })} ${translatedTitle}`;
        }
      }
      return {
        ...event,
        translated_title: translatedTitle,
        avg_rating: parseFloat(event.avg_rating).toFixed(1),
        rating_count: parseInt(event.rating_count),
      };
    });
    res.json({ events });
  } catch (err) {
    console.error("Search events error:", err.stack);
    res
      .status(500)
      .json({ error: req.t("search_error"), details: err.message });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  searchEventsByLocation,
  rateEvent,
};
