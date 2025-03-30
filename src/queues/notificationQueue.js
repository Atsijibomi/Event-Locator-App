const Queue = require("bull");
const db = require("../config/db");

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};
const notificationQueue = new Queue("notification-queue", {
  redis: redisConfig,
});

const sendNotification = async (userEmail, event) => {
  console.log(
    `Sending email to ${userEmail}: Reminder for "${event.title}" at ${event.event_time}`
  );
};

notificationQueue.process(async (job) => {
  const { userId, eventId } = job.data;
  const userResult = await db.query(
    "SELECT email, notification_preference FROM profiles WHERE id = $1",
    [userId]
  );
  const eventResult = await db.query(
    "SELECT title, event_time FROM event_nodes WHERE id = $1",
    [eventId]
  );

  if (userResult.rows.length > 0 && eventResult.rows.length > 0) {
    const user = userResult.rows[0];
    const event = eventResult.rows[0];
    if (user.notification_preference === "email") {
      await sendNotification(user.email, event);
    }
  }
});

module.exports = notificationQueue;
