# Event Locator API

![Markdown Badge](https://img.shields.io/badge/README-Markdown-blue)

A RESTful API built with Node.js and Express for managing location-based events, featuring user authentication, internationalization (i18n), event ratings, location-based search, and scheduled notifications.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Setup](#setup)
   - [Install Prerequisites](#install-prerequisites)
   - [Clone the Repository](#clone-the-repository)
   - [Set Up Environment Variables](#set-up-environment-variables)
   - [Set Up PostgreSQL Database](#set-up-postgresql-database)
   - [Set Up Redis](#set-up-redis)
   - [Install Node.js Dependencies](#install-nodejs-dependencies)
5. [Running the Application](#running-the-application)
6. [Testing](#testing)
   - [Unit Tests](#unit-tests)
   - [Manual Testing](#manual-testing)
7. [API Endpoints](#api-endpoints)
   - [Users](#users)
   - [Events](#events)
8. [Internationalization](#internationalization)
9. [Notifications](#notifications)
10. [Project Structure](#project-structure)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

The Event Locator API allows users to register, log in, create and manage events, rate events, and search for events near their location. It supports multiple languages (English and Spanish), sends notifications for upcoming events via a queue system, and uses PostgreSQL for data storage and Redis for queue management.

This project demonstrates proficiency in Node.js, Express, PostgreSQL, Redis, and testing with Jest, incorporating advanced features like geospatial queries and internationalization.

---

## Features

- **User Authentication**: Register and login with JWT-based authentication.
- **Event Management**: Create, read, update, and delete (CRUD) events.
- **Geospatial Search**: Find events within a radius using PostgreSQL's PostGIS.
- **Ratings**: Rate events with a 1-5 scale, aggregated in search results.
- **Internationalization**: Responses in English (`en`) or Spanish (`es`) based on user preference.
- **Notifications**: Scheduled reminders for events within 24 hours using Bull queue and Redis.
- **Testing**: Comprehensive unit tests with Jest and Supertest.

---

## Prerequisites

- **Node.js**: v16.x or higher
- **PostgreSQL**: v12.x or higher with PostGIS extension
- **Redis**: v6.x or higher
- **npm**: v8.x or higher
- **Git**: For cloning the repository
- **curl** or **Postman**: For manual API testing

---

## Setup

### Install Prerequisites

1. **Node.js and npm**:

   - Download and install from [nodejs.org](https://nodejs.org/).
   - Verify:
     ```bash
     node -v  # Should output v16.x or higher
     npm -v   # Should output v8.x or higher
     ```

2. **PostgreSQL**:

   - Mac:
     ```bash
     brew install postgresql
     ```
   - Ubuntu:
     ```bash
     sudo apt update
     sudo apt install postgresql postgresql-contrib
     ```
   - Windows: Download from postgresql.org and follow installer.
   - Verify:
     ```bash
     psql --version  # Should output psql (PostgreSQL) 12.x or higher
     ```

3. **Redis**:

   - Mac:
     ```bash
     brew install redis
     ```
   - Ubuntu:
     ```bash
     sudo apt install redis-server
     ```
   - Windows: Download from redis.io or use WSL.
   - Verify:
     ```bash
     redis-cli --version  # Should output redis-cli 6.x or higher
     ```

4. **Git**:
   - Install: git-scm.com
   - Verify:
     ```bash
     git --version
     ```

### Clone the Repository

Clone the project:

```bash
git clone <your-repo-url>
cd event-locator-1
```

### Set Up Environment Variables

Create a .env file in the project root:

```bash
touch .env
```

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

Copy the output for use in your .env file.

Add the following content to .env:

```plaintext
# Database
   DB_HOST=YOUR_HOST
   DB_USER=POSTGRES_USERNAME
   DB_PASSWORD=POSTGRES_PASSWORD
   DB_NAME= DATABASE_NAME
   DB_PORT=POSTGRES_PORT

# Other variables
   DATABASE_URL=POSTGRES_URL
   JWT_SECRET=GENERATED_JWT_TOKEN
   PORT=SERVER_PORT
   REDIS_HOST=REDIS_HOST
   REDIS_PORT=REDIS_PORT
   REDIS_PASSWORD=REDIS_PASSWORD
```

Customize:

- Replace `your_password` with your PostgreSQL password.
- Replace `your_generated_jwt_secret` with the output from the openssl command.
- If your PostgreSQL setup uses a different user, host, or port, adjust DATABASE_URL (e.g., postgres://myuser:mypass@myhost:5432/event_locator).

### Set Up PostgreSQL Database

1. Start PostgreSQL:

   - Mac:
     ```bash
     brew services start postgresql
     ```
   - Ubuntu:
     ```bash
     sudo service postgresql start
     ```
   - Windows: Start via Services or PgAdmin.

2. Log In to PostgreSQL:

   ```bash
   psql -U postgres
   ```

   Enter your password if prompted.

3. Create the Database:

   ```sql
   CREATE DATABASE event_locator;
   \c event_locator
   ```

4. Enable PostGIS Extension:

   ```sql
   CREATE EXTENSION postgis;
   ```

   Note: If this fails with "could not open extension control file", you may need to install the PostGIS extension for PostgreSQL:

   - Ubuntu: `sudo apt install postgresql-12-postgis-3` (adjust version as needed)
   - Mac: `brew install postgis`
   - Windows: Use the Application Stack Builder that comes with PostgreSQL

5. Create Tables:

   ```sql
   CREATE TABLE profiles (
     id SERIAL PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     location GEOGRAPHY(POINT),
     preferred_radius FLOAT DEFAULT 10,
     preferred_categories TEXT[] DEFAULT '{}',
     language VARCHAR(10) DEFAULT 'en',
     profile_tag VARCHAR(20) UNIQUE,
     notification_preference VARCHAR(50) DEFAULT 'email'
   );

   CREATE TABLE event_nodes (
     id SERIAL PRIMARY KEY,
     event_code VARCHAR(20) UNIQUE NOT NULL,
     title VARCHAR(255) NOT NULL,
     description TEXT,
     location GEOGRAPHY(POINT),
     event_time TIMESTAMP WITH TIME ZONE,
     categories TEXT[] DEFAULT '{}',
     creator_id INTEGER REFERENCES profiles(id)
   );

   CREATE TABLE event_ratings (
     id SERIAL PRIMARY KEY,
     event_id INTEGER REFERENCES event_nodes(id),
     user_id INTEGER REFERENCES profiles(id),
     rating INTEGER CHECK (rating >= 1 AND rating <= 5),
     created_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(event_id, user_id)
   );

   CREATE TABLE user_activity (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES profiles(id),
     action VARCHAR(255),
     timestamp TIMESTAMP DEFAULT NOW()
   );
   ```

6. Verify Tables:

   ```sql
   \dt
   ```

   Should list: profiles, event_nodes, event_ratings, user_activity.

   Exit: `\q`

### Set Up Redis

1. Start Redis:

   - Mac:
     ```bash
     brew services start redis
     ```
   - Ubuntu:
     ```bash
     redis-server
     ```
   - Windows: Run redis-server.exe from install directory.

2. Verify Redis:
   ```bash
   redis-cli ping
   ```
   Expected: PONG

### Install Node.js Dependencies

Install project dependencies:

```bash
npm install
```

Verify:
Check node_modules/ exists and contains packages like express, pg, bull, etc.

## Running the Application

1. Start Development Server:

   ```bash
   npm run dev
   ```

   Uses nodemon for auto-restart on changes.
   Expected logs: Server running on port 5001, Connected to PostgreSQL database!.

2. Production Start:

   ```bash
   npm start
   ```

3. Verify:

   ```bash
   curl http://localhost:5001/db-test
   ```

   Expected: {"message": "Database connected!", "time": "..."}

   You can also access this in your browser at: http://localhost:5001/db-test

## Testing

### Unit Tests

1. Run Tests:

   ```bash
   npm test
   ```

   Runs 9 Jest tests covering registration, login, event CRUD, ratings, search, and notifications.
   Expected: 9 passed, 9 total.

2. Debugging (if needed):
   ```bash
   npm test -- --detectOpenHandles
   ```

### Manual Testing

See API Endpoints section for detailed examples.

## API Endpoints

### Users

1. **Register**:

   ```plaintext
   POST /api/users/register
   Content-Type: application/json
   Body: {"email": "test@example.com", "password": "test123", "latitude": 40.7128, "longitude": -74.0060, "language": "es"}
   Response: 201 {"message": "Usuario registrado", "user": {"id": 1, "email": "...", "profile_tag": "..."}}
   ```

2. **Login (Generate JWT Token)**:

   ```plaintext
   POST /api/users/login
   Body: {"email": "test@example.com", "password": "test123"}
   Response: 200 {"message": "Inicio de sesión exitoso", "token": "...", "profile_tag": "..."}
   ```

   Steps to Generate JWT Token:

   - Send the above POST /api/users/login request using curl or Postman.
   - Copy the token value from the response (e.g., eyJhbGciOiJIUzI1NiIs...).
   - Use this token in Authorization: Bearer <token> headers for authenticated requests.

### Events

1. **Create Event (Authenticated)**:

   ```plaintext
   POST /api/events
   Authorization: Bearer <token>
   Body: {"title": "Concert", "latitude": 40, "longitude": -74, "event_time": "2025-04-01T12:00:00Z", "categories": ["music"]}
   Response: 201 {"message": "Evento creado", "event": {"id": 1, "title": "Concert"}}
   ```

2. **Get All Events**:

   ```plaintext
   GET /api/events
   Response: 200 {"events": [{...}, {...}]}
   ```

3. **Get Event by ID**:

   ```plaintext
   GET /api/events/:id
   Response: 200 {"event": {...}}
   ```

4. **Update Event (Authenticated)**:

   ```plaintext
   PUT /api/events/:id
   Authorization: Bearer <token>
   Body: {"title": "Updated Concert"}
   Response: 200 {"message": "Evento actualizado", "event": {...}}
   ```

5. **Delete Event (Authenticated)**:

   ```plaintext
   DELETE /api/events/:id
   Authorization: Bearer <token>
   Response: 200 {"message": "Evento eliminado"}
   ```

6. **Rate Event (Authenticated)**:

   ```plaintext
   POST /api/events/rate
   Authorization: Bearer <token>
   Body: {"event_id": 1, "rating": 4}
   Response: 201 {"message": "Calificación enviada", "rating": {"id": 1, "rating": 4}}
   ```

7. **Search Nearby Events (Authenticated)**:
   ```plaintext
   GET /api/events/search/nearby?latitude=40&longitude=-74&radius=10&categories=music
   Authorization: Bearer <token>
   Response: 200 {"events": [{"id": 1, "title": "Concert", "avg_rating": "4.0", ...}]}
   ```

## Internationalization

- **How It Works**: Uses i18next with translations in src/locales/en/translation.json and src/locales/es/translation.json. Language is set from the user's language field on login/register.

- **Test It**:

  - Register with language: "es", login, create an event → "Evento creado".
  - Register with language: "en", login, create an event → "Event created".

- **Change Language**: Update profiles.language:
  ```sql
  UPDATE profiles SET language = 'en' WHERE email = 'test@example.com';
  ```

## Notifications

- **Setup**: Uses Bull queue with Redis. Cron job in src/scheduler/notificationScheduler.js checks events every minute.

- **How It Works**: Events within 24 hours trigger a queue job, logging a mock email (extendable to real email service).

- **Test It**:
  - Create an event with event_time within 24 hours:
    ```bash
    curl -X POST http://localhost:5001/api/events -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"title": "Soon", "latitude": 40, "longitude": -74, "event_time": "'$(date -v+12H -u +"%Y-%m-%dT%H:%M:%SZ")'", "categories": ["test"]}'
    ```
  - Check server logs for Sending email to... within a minute.

## Project Structure

```text
event-locator-1/
├── src/
│   ├── config/         # DB and i18n setup
│   ├── controllers/    # API logic
│   ├── middleware/     # Auth and language middleware
│   ├── models/         # User, Event, Rating models
│   ├── queues/         # Notification queue
│   ├── routes/         # API routes
│   ├── scheduler/      # Cron jobs
│   ├── locales/        # Translation files
│   └── index.js        # App entry
├── tests/              # Jest tests
├── .env                # Environment variables
└── package.json
```

## Troubleshooting

- **DB Connection Fails**: Verify .env matches PostgreSQL setup, run psql -U postgres -d event_locator.
- **Redis Errors**: Ensure redis-server is running, check REDIS\_\* vars.
- **Tests Fail**: Check DB schema, run with --detectOpenHandles.
- **Language Issues**: Verify language field in profiles, check locales/ files.
- **Token Issues**: Ensure JWT_SECRET in .env is properly set (generate with `openssl rand -hex 32`), regenerate token via login.
- **Permission Issues**: If you encounter permission errors with PostgreSQL, check user permissions with `\du` in psql.
