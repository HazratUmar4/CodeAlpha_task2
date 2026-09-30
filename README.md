# CodeAlpha_EventRegistration

A simple Event Registration System backend built with Node.js, Express.js and SQLite. Users can view events, register for them, and view or cancel their registrations.

## Features
- Database models for users, events and registrations
- View event list and event details (with seats left)
- Register a user for an event (capacity and duplicate checks)
- View and cancel a user's registrations
- Organizers can create new events

## Tech Stack
Node.js, Express.js, SQLite (better-sqlite3)

## How to Run
```
npm install
npm start
```
Server runs on http://localhost:3000 (two sample events are added automatically).

## API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/users | Create user `{ name, email }` |
| GET | /api/events | List all events |
| GET | /api/events/:id | Event details |
| POST | /api/events | Create event `{ title, date, description, location, capacity }` |
| POST | /api/events/:id/register | Register `{ user_id }` |
| GET | /api/users/:id/registrations | View a user's registrations |
| DELETE | /api/registrations/:id | Cancel a registration |
