const db = require("../config/db");
const bcrypt = require("bcrypt");

class User {
  static async create({
    email,
    password,
    latitude,
    longitude,
    language,
    notification_preference,
    preferred_radius,
    preferred_categories,
    profile_tag,
  }) {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const locationQuery = `POINT(${longitude} ${latitude})`;

    const result = await db.query(
      `INSERT INTO profiles (email, password_hash, location, language, notification_preference, preferred_radius, preferred_categories, profile_tag)
       VALUES ($1, $2, ST_GeogFromText($3), $4, $5, $6, $7, $8)
       RETURNING id, email, profile_tag`,
      [
        email,
        password_hash,
        locationQuery,
        language || "en",
        notification_preference || "email",
        preferred_radius || 10,
        preferred_categories || [],
        profile_tag,
      ]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await db.query("SELECT * FROM profiles WHERE email = $1", [
      email,
    ]);
    return result.rows[0];
  }
}

module.exports = User;
