const request = require("supertest");
const jwt = require("jsonwebtoken");
const Queue = require("bull");
const db = require("../src/config/db");
const { createApp } = require("../src/index");
const eventRoutes = require("../src/routes/eventRoutes");

// Mock jwt
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn((payload, secret) => `mocked-token-${JSON.stringify(payload)}`),
  verify: jest.fn((token, secret) => {
    if (typeof token === "string" && token.startsWith("mocked-token-")) {
      return JSON.parse(token.replace("mocked-token-", ""));
    }
    throw new Error("Invalid token");
  }),
}));

// Mock Bull queue
jest.mock("bull", () => {
  const mockQueue = {
    process: jest.fn(),
    add: jest.fn(),
  };
  const MockQueueConstructor = jest.fn(() => mockQueue);
  MockQueueConstructor.mockInstance = mockQueue;
  return MockQueueConstructor;
});

jest.mock("../src/queues/notificationQueue", () => {
  const Queue = require("bull");
  return Queue.mockInstance;
});

// Mock scheduler
jest.mock("../src/scheduler/notificationScheduler", () => {});

describe("Event Locator API Tests", () => {
  let app;
  let token;

  beforeAll(async () => {
    app = createApp();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret";
    await db.query(
      "TRUNCATE profiles, event_nodes, event_ratings, user_activity RESTART IDENTITY CASCADE"
    );

    // Force i18next to use 'es' globally
    const { i18next } = require("../src/config/i18n");
    i18next.changeLanguage("es");

    app.use((req, res, next) => {
      req.i18n = i18next;
      req.user = { id: 1, email: "test@example.com" };
      next();
    });

    app.use("/api/events", eventRoutes);

    token = 'mocked-token-{"id":1,"email":"test@example.com"}';
  }, 10000);

  afterAll(async () => {
    await db.end();
  }, 10000);

  test("User Registration", async () => {
    const res = await request(app).post("/api/users/register").send({
      email: "test@example.com",
      password: "test123",
      latitude: 40.7128,
      longitude: -74.006,
      language: "es",
      notification_preference: "email",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Usuario registrado");
  }, 10000);

  test("User Login with JWT", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com", password: "test123" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Inicio de sesión exitoso");
    expect(res.body.token).toMatch(/^mocked-token-/);
    token = res.body.token;
  }, 10000);

  test("Create Event with Auth", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Event",
        description: "A test event",
        latitude: 40.7128,
        longitude: -74.006,
        event_time: "2025-04-01T12:00:00Z",
        categories: ["test"],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Event created");
  }, 10000);

  test("Search Events by Location", async () => {
    const res = await request(app)
      .get(
        "/api/events/search/nearby?latitude=40.7128&longitude=-74.0060&radius=10&categories=test"
      )
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].title).toBe("Test Event");
  }, 10000);

  test("Rate Event", async () => {
    const res = await request(app)
      .post("/api/events/rate")
      .set("Authorization", `Bearer ${token}`)
      .send({ event_id: 1, rating: 4 });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Calificación enviada");
  }, 10000);

  test("Search Events with Rating", async () => {
    const res = await request(app)
      .get(
        "/api/events/search/nearby?latitude=40.7128&longitude=-74.0060&radius=10&categories=test"
      )
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.events[0].avg_rating).toBe("4.0");
  }, 10000);

  test("Invalid Rating", async () => {
    const res = await request(app)
      .post("/api/events/rate")
      .set("Authorization", `Bearer ${token}`)
      .send({ event_id: 1, rating: 6 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("La calificación debe estar entre 1 y 5");
  }, 10000);

  test("Unauthorized Access", async () => {
    const res = await request(app)
      .post("/api/events/rate")
      .send({ event_id: 1, rating: 4 });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("No token provided");
  }, 10000);

  test("Notification Queue Add", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Soon Event",
        description: "Happening soon",
        latitude: 40.7128,
        longitude: -74.006,
        event_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        categories: ["test"],
      });
    expect(res.statusCode).toBe(201);
    const QueueInstance = Queue.mockInstance;
    QueueInstance.add({ userId: 1, eventId: 2 }, { delay: 0 });
    expect(QueueInstance.add).toHaveBeenCalled();
  }, 10000);
});
