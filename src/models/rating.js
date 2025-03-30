const db = require("../config/db");

class Rating {
  static async createOrUpdate({ event_id, user_id, rating }) {
    const result = await db.query(
      `INSERT INTO event_ratings (event_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET rating = $3, created_at = NOW()
       RETURNING id, rating`,
      [event_id, user_id, rating]
    );
    return result.rows[0];
  }
}

module.exports = Rating;
