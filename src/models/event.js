const db = require("../config/db");

class Event {
  static async create({
    title,
    description,
    latitude,
    longitude,
    event_time,
    categories,
    creator_id,
    event_code,
  }) {
    const locationQuery = `POINT(${longitude} ${latitude})`;

    const result = await db.query(
      `INSERT INTO event_nodes (event_code, title, description, location, event_time, categories, creator_id)
       VALUES ($1, $2, $3, ST_GeogFromText($4), $5, $6, $7)
       RETURNING *`,
      [
        event_code,
        title,
        description,
        locationQuery,
        event_time,
        categories || [],
        creator_id,
      ]
    );
    return result.rows[0];
  }
}

module.exports = Event;
