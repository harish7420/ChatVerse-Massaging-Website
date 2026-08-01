# ChatVerse Deployment Guide 🌐

This guide outlines step-by-step instructions for deploying ChatVerse to production using **Render (Backend)**, **Vercel (Frontend)**, **MongoDB Atlas (Database)**, and **Cloudinary (CDN Storage)**.

---

## 1. MongoDB Atlas Database Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Database User under **Database Access**.
3. Allow Network Access (`0.0.0.0/0`) under **Network Access**.
4. Copy the connection string (e.g., `mongodb+srv://<username>:<password>@cluster.mongodb.net/chatverse?retryWrites=true&w=majority`).

---

## 2. Cloudinary CDN Setup
1. Sign up on [Cloudinary](https://cloudinary.com/).
2. Navigate to your Dashboard and copy:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

---

## 3. Backend Deployment on Render
1. Push your code repository to GitHub.
2. Log in to [Render](https://render.com/) and click **New > Web Service**.
3. Connect your GitHub repository and select the `/server` subfolder as Root Directory.
4. Set Build Command: `npm install`
5. Set Start Command: `node server.js`
6. Add Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET`: `<Generate strong secret key>`
   - `CLIENT_URL`: `https://your-frontend-app.vercel.app`
   - `CLOUDINARY_CLOUD_NAME`: `<Cloudinary Cloud Name>`
   - `CLOUDINARY_API_KEY`: `<Cloudinary Key>`
   - `CLOUDINARY_API_SECRET`: `<Cloudinary Secret>`
7. Click **Deploy Web Service**. Copy the generated Render Web Service URL.

---

## 4. Frontend Deployment on Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Select your GitHub repository and set Root Directory to `client`.
3. Set Framework Preset: **Vite**.
4. Build Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click **Deploy**.
