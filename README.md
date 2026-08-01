# ChatVerse - Enterprise Real-Time Communication Platform 💬🚀

ChatVerse is an end-to-end production-grade real-time chat web application built with **React, Vite, Node.js, Express, Socket.io, Mongoose, and Tailwind CSS**. Inspired by WhatsApp, Telegram, and Discord, it features rich UI components, dark/light modes, WebRTC audio/video call signaling, administration panel analytics, JWT authentication, and media storage.

---

## 🌟 Key Features

### 🔐 Authentication & Security
- **JWT Authentication** with HTTP-Only cookie handling.
- **Bcrypt Password Hashing** & password strength rules.
- **Password Reset & Account Recovery** workflow with tokens.
- **Security Middleware**: Helmet Headers, Rate-Limiting, CORS configuration, and XSS sanitization.

### 💬 Real-Time Messaging Engine
- **Socket.io WebSocket Integration**: Sub-millisecond message delivery.
- **Read Receipts & Delivery Indicators**: Real-time blue checkmarks.
- **Live Typing Indicators**: Broadcasts active typing state across active chat rooms.
- **Emoji Picker & Reactions**: Instant reaction badges on messages.
- **Message Controls**: Reply preview, message text copy, and message deletion.

### 📁 Media & File Uploads
- **Multi-Format Attachment Support**: Images (JPEG, PNG, WebP), Videos (MP4), Documents (PDF, DOCX), Audio.
- **Cloudinary & Disk Storage Fallback**: Seamless CDN routing for attachments.

### 📞 WebRTC Audio & Video Calling
- Peer-to-peer signaling over WebSockets (`call_user`, `answer_call`, `ice_candidate`).
- Interactive overlay modal with microphone mute and camera toggles.

### 🛡️ Admin Moderation Console
- Dashboard analytics (Total users, active sockets, message metrics, uptime).
- Comprehensive User Table with one-click **Account Suspension** and **Permanent Deletion**.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS, Framer Motion
- **Icons**: Lucide React, React Icons
- **HTTP & Sockets**: Axios, Socket.io-client
- **State Management**: Context API (Auth, Socket, Chat, Theme)

### Backend
- **Runtime**: Node.js & Express.js
- **Real-Time Layer**: Socket.io 4.x
- **Database**: MongoDB Atlas with Mongoose ODM
- **Media Engine**: Cloudinary & Multer
- **Security**: Helmet, Express Rate Limit, Cookie Parser, Cors

---

## 📂 Project Structure

```
chatverse/
├── client/                 # React Vite Frontend Application
│   ├── src/
│   │   ├── components/     # UI Components (Sidebar, ChatArea, MessageBubble, Input, CallModal, Admin)
│   │   ├── context/        # React Context Providers (Auth, Socket, Chat, Theme)
│   │   ├── hooks/          # Custom Hooks (useAuth, useSocket, useChat)
│   │   ├── pages/          # Pages (Landing, Login, Register, ChatDashboard, Admin, Profile, Settings)
│   │   ├── services/       # Axios API client
│   │   ├── App.jsx         # Router & Guards setup
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
└── server/                 # Node.js Express & Socket.io Server
    ├── config/             # DB & Cloudinary Configuration
    ├── controllers/        # Express Controllers (Auth, User, Chat, Message, Admin)
    ├── middleware/         # Middleware (Auth, Error, Upload, Validation)
    ├── models/             # Mongoose Schemas (User, Chat, Message, Notification, BlockedUser)
    ├── routes/             # Express API Routes
    ├── socket/             # Socket.io Event Handler
    ├── uploads/            # Local attachment storage
    ├── server.js           # Server Entry Point
    └── package.json
```

---

## 🚀 Quick Start & Local Setup

### 1. Clone & Setup Backend
```bash
cd server
npm install
npm start
```
*Note: The server will run on `http://localhost:5000` with resilient mock database fallback if MongoDB URI is not supplied.*

### 2. Setup Frontend
```bash
cd client
npm install
npm run dev
```
*Access the application in your browser at `http://localhost:5173`.*

---

## 🧪 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin User** | `admin@chatverse.com` | `admin123` |
| **Standard User** | `user@chatverse.com` | `user123` |
