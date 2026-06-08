# Common Ground But Better

Common Ground But Better is a small browser-based video chat app that pairs two users together, opens camera and microphone access in the browser, and negotiates a WebRTC connection through a Socket.IO backend.

The project is split into two parts:

- `backend/` runs an Express + Socket.IO server on port `4000`
- `frontend/` runs a Vite + React client that requests media access and connects to the backend

## What it does

- Opens the local camera and microphone in the browser
- Lets a user enter a name and join the app
- Matches connected users into pairs through a queue
- Uses WebRTC peer connections for direct media transfer
- Passes offers, answers, and ICE candidates through Socket.IO

## Tech Stack

- Frontend: React, TypeScript, Vite, react-router-dom, socket.io-client
- Backend: Node.js, Express, Socket.IO, TypeScript

## Project Structure

```text
backend/
  src/
    index.ts
    managers/
      RoomManager.ts
      UserManager.ts

frontend/
  src/
    App.tsx
    components/
      Landing.tsx
      Room.tsx
```

## Prerequisites

- Node.js 18 or newer
- npm
- A browser with camera and microphone access

## Setup

Install dependencies for both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Running the App

Start the backend first:

```bash
cd backend
npm run build
npm run start
```

Then start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, allow camera and microphone permissions, and join the app. When two users are connected, the backend creates a room and forwards the WebRTC signaling messages between them.

## Notes

- The backend is currently hardcoded to `http://localhost:4000` in the client.
- The app is designed for 1:1 connections.
- If you change the backend port, update the URL in `frontend/src/components/Room.tsx`.

## Current Limitations

- There is no persistent room storage.
- There is no authentication or user profile system.
- The UI is minimal and focused on connection flow rather than styling.
