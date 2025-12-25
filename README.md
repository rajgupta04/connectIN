# connectIN

A LinkedIn-style alumni networking app with authentication, profiles, posts (images/GIFs/videos), real-time chat/notifications, mentorship matching, and basic analytics.

## Tech Stack
- **Client:** React + Vite + Tailwind
- **Server:** Node.js + Express + MongoDB (Mongoose)
- **Realtime:** Socket.IO
- **Media storage:** Cloudinary

## Monorepo Structure
- `client/` – React frontend
- `server/` – Express API + Socket.IO + MongoDB models

## Prerequisites
- Node.js 18+ (recommended)
- MongoDB connection string (local or Atlas)
- Cloudinary account (for uploads)

## Environment Variables
Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_long_random_secret

# Google OAuth (Sign-in)
GOOGLE_CLIENT_ID=130574480266-4qeuib68n1ok96g822u5q8dkotuah1jf.apps.googleusercontent.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Notes:
- `JWT_SECRET` must match what the client uses via the API token flow.
- Cloudinary is required for avatar/cover and post media uploads.

Create client env files (Vite):

`client/.env.local` (local dev):

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=130574480266-4qeuib68n1ok96g822u5q8dkotuah1jf.apps.googleusercontent.com
```

Production: set these in your hosting provider (recommended), or use `client/.env.production`:

```env
VITE_API_BASE_URL=https://YOUR-RENDER-BACKEND.onrender.com/api
VITE_SOCKET_URL=https://YOUR-RENDER-BACKEND.onrender.com
```

## Install
From the repo root:

```bash
cd server
npm install

cd ../client
npm install
```

## Run (Development)
Start the API server:

```bash
cd server
npm run dev
# or: npm start
```

Start the client:

```bash
cd client
npm run dev
```

Default URLs:
- Client: `http://localhost:5173`
- Server: `http://localhost:5000`

## Build (Production)
Client build:

```bash
cd client
npm run build
```

## Key Features
- **Auth:** Register/login + protected routes
- **Profiles:** Avatar + cover photo (with crop UI), education/experience, mentor display
- **Posts:** Create/delete, likes, threaded comments/replies
- **Media uploads:** Images/GIFs/videos up to **50MB** for posts; video playback in feed
- **Mentorship:** Requests and accepted mentor relationships
- **Analytics (LinkedIn-style counts):**
  - Profile viewers count (deduped window)
  - Post impressions count (viewport-based, deduped window)
  - Post impression counts are **visible only to the post owner**
- **Realtime:** Socket.IO for live updates (chat/notifications and owner impression updates)

## API Overview (High-Level)
Base: `/api/...`
- `auth` – login/register/load user
- `profile` – profile CRUD + avatar/cover upload
- `posts` – feed + post create + impression endpoint
- `chat`, `notifications`, `mentorship`, `connections`, etc.

## Common Troubleshooting
- **Uploads failing (Cloudinary):** verify `CLOUDINARY_*` env vars and file type support on your Cloudinary plan.
- **Socket not connecting:** ensure server is running on `http://localhost:5000` and the client has a valid JWT token.
- **Impressions not updating live:** restart the server after changes; the owner receives `post_impression_updated` via Socket.IO.

## Scripts
Run `npm run` inside `client/` or `server/` to see available scripts for that package.
