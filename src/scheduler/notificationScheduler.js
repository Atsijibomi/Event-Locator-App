const cron = require("node-cron");
const notificationQueue = require("../queues/notificationQueue");
const db = require("../config/db");

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("Checking for upcoming events...");
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const result = await db.query(
      `SELECT id, creator_id, title, event_time 
       FROM event_nodes 
       WHERE event_time BETWEEN $1 AND $2`,
      [now, in24Hours]
    );

    const events = result.rows;
    for (const event of events) {
      await notificationQueue.add(
        { userId: event.creator_id, eventId: event.id },
        { delay: event.event_time - now - 24 * 60 * 60 * 1000 } // Queue 24h before
      );
      console.log(`Queued reminder for event: ${event.title}`);
    }
  } catch (err) {
    console.error("Scheduler error:", err);
  }
});

console.log("Notification scheduler started");
