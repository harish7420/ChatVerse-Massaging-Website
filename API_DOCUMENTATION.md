# ChatVerse API Documentation 📡

All REST endpoints are prefixed with `/api`. Protected routes require a valid JWT token sent in the `Authorization: Bearer <token>` header or `jwt` HTTP-Only cookie.

---

## 1. Authentication Endpoints `/api/auth`

### `POST /api/auth/register`
Creates a new user account.
- **Body**: `{ "username": "string", "email": "string", "password": "string" }`
- **Response**: `{ "success": true, "user": {...}, "token": "JWT_TOKEN" }`

### `POST /api/auth/login`
Authenticates existing user credentials.
- **Body**: `{ "email": "string", "password": "string" }`
- **Response**: `{ "success": true, "user": {...}, "token": "JWT_TOKEN" }`

### `POST /api/auth/logout`
Logs out user and clears HTTP-Only cookie.

### `POST /api/auth/forgot-password`
Generates password reset token.
- **Body**: `{ "email": "string" }`

### `POST /api/auth/reset-password`
Resets user password using valid token.
- **Body**: `{ "resetToken": "string", "newPassword": "string" }`

---

## 2. User Endpoints `/api/users`

### `GET /api/users?search=query`
Searches users by username or email.

### `GET /api/users/:id`
Retrieves public profile details of a specific user.

### `PUT /api/users/update`
Updates avatar image, bio, or username. Accepts `multipart/form-data`.

### `POST /api/users/block/:id` & `POST /api/users/unblock/:id`
Blocks or unblocks a specific target contact.

---

## 3. Chat Endpoints `/api/chat`

### `POST /api/chat`
Fetches or creates a 1-on-1 direct chat with a target user.
- **Body**: `{ "userId": "string" }`

### `GET /api/chat`
Returns list of all active conversations for the authenticated user.

---

## 4. Message Endpoints `/api/message`

### `POST /api/message`
Sends a message or file attachment. Accepts `multipart/form-data`.
- **Form Fields**: `chatId`, `content`, `replyToId`, `file` (Optional attachment)

### `GET /api/message/:chatId`
Retrieves entire message timeline history for a chat.

### `PUT /api/message/:id/react`
Adds an emoji reaction to a message.
- **Body**: `{ "emoji": "👍" }`

### `DELETE /api/message/:id`
Deletes a message.

---

## 5. Admin Endpoints `/api/admin`

### `GET /api/admin/stats`
Retrieves platform KPI analytics metrics.

### `GET /api/admin/users`
Retrieves list of all registered accounts.

### `PUT /api/admin/users/:id/suspend`
Toggles suspension state of a user.

### `DELETE /api/admin/users/:id`
Deletes user account permanently.
