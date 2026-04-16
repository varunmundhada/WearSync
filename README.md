# WearSync

A full-stack **user registration/login + profile** project with a simple frontend and a secure backend API.  
The backend supports **JWT authentication**, **encrypted user profile storage**, and **wearable data sync** including **real-time streaming via WebSockets**.

## Features
- User **Sign Up / Login** (JWT-based auth)
- Password hashing with **bcrypt**
- Profile APIs (stored securely / encrypted)
- Wearable data sync endpoints
- **WebSocket** real-time streaming for wearable data
- Security middleware: **helmet**, **rate limiting**, **CORS**
- MongoDB database using **mongoose**

## Tech Stack
### Backend (`/backend`)
- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- bcrypt (`bcryptjs`)
- WebSockets (`ws`)
- Security: `helmet`, `express-rate-limit`, `express-validator`, `cors`, `dotenv`

### Frontend (`/frontend`)
- HTML + CSS + JavaScript
- UI pages for Login/Signup and a dashboard to:
  - edit profile
  - sync wearable data
  - connect to WebSocket stream
  - view encrypted vs decrypted data

## Project Structure
- `backend/`
  - `server.js` — Express app + MongoDB connection + WebSocket setup
  - `routes/` — API routes (`auth`, `profile`, `wearable`)
  - `models/` — MongoDB schemas
  - `middleware/` — middleware (auth/security/validation)
  - `utils/` — utilities (encryption helpers, etc.)
  - `ws/` — WebSocket logic
- `frontend/`
  - `index.html` — UI (WearSync)
  - `css/` — styles
  - `js/` — frontend scripts (`api.js`, `auth.js`, `dashboard.js`, `websocket.js`, `app.js`)

## Setup & Run

### 1) Backend
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` (example):
```env
MONGODB_URI=mongodb://127.0.0.1:27017/wearsync
PORT=5000
JWT_SECRET=your_secret_key
NODE_ENV=development
```

Start the backend:
```bash
npm run dev
# or
npm start
```

Backend runs on (default):
- `http://localhost:5000`
- Health check: `GET /api/health`

### 2) Frontend
Open the frontend with a live server (recommended) or directly in browser:
- open `frontend/index.html`

## Notes
- CORS in the backend allows common local frontend ports (like `5500` / `3000`).
- For full functionality you must have MongoDB running and `MONGODB_URI` set correctly.

## Author
Varun Mundhada
