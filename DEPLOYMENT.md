# Complete Deployment Guide — Crescent ReClaim
**Portal Creator:** M. MOHAMED ASKAR (Reg No: 240071601159)  
**Institution:** B.S. Abdur Rahman Crescent Institute of Science & Technology  

---

## 🎯 The Deployment Challenge & How We Solved It
On cloud platforms (Render, Vercel, Railway, Heroku):
1. **Ephemeral Filesystems:** Files saved to a local folder like `./uploads/` get deleted when serverless containers sleep or rebuild.
2. **Database Persistence:** Local SQLite files reset unless stored on a persistent volume or cloud database.

### Our Solution for 100% Data Persistence:
* **Permanent Photo Visibility:** The portal's frontend automatically optimizes & compresses uploaded smartphone photos (max 900px, 82% quality WebP/JPEG) and stores the data URI directly inside the database row `photo_url`. **This ensures uploaded photos NEVER break, never 404, and stay permanently visible across all devices worldwide.**
* **Dual Database Engine:** 
  - Works with native SQLite out-of-the-box (`crescent_reclaim.db`).
  - Supports **Cloud PostgreSQL** (Neon.tech or Supabase) simply by setting the `DATABASE_URL` environment variable.

---

## 🚀 Option 1: Deploy to Render.com (Recommended & 100% Free)
Render is the easiest way to deploy this full-stack Node.js app with zero code changes.

### Step 1: Push Code to GitHub
1. Create a free GitHub account if you don't have one: [github.com](https://github.com).
2. Create a new repository named `crescent-reclaim`.
3. Push the `campus-lost-and-found` folder to your GitHub repository:
   ```bash
   cd campus-lost-and-found
   git init
   git add .
   git commit -m "Initial commit of Crescent ReClaim portal"
   git branch -M main
   git remote add origin https://github.com/<your-username>/crescent-reclaim.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up with GitHub.
2. Click **New +** -> **Web Service**.
3. Select your `crescent-reclaim` GitHub repository.
4. Fill in the settings:
   - **Name:** `crescent-reclaim`
   - **Region:** Singapore or Frankfurt (fastest for India)
   - **Environment:** `Node`
   - **Build Command:** *(leave empty or `npm install`)*
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
5. Click **Deploy Web Service**!
6. In ~60 seconds, Render will assign you a live HTTPS URL:
   `https://crescent-reclaim.onrender.com`

---

## ⚡ Option 2: Deploy to Vercel (Instant Serverless)
This project is already pre-configured for Vercel with `vercel.json` and `api/index.js`.

### Steps:
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your `crescent-reclaim` repository.
4. Click **Deploy**!
5. Vercel automatically routes `/api/*` to the serverless backend and serves `index.html` on its Global CDN.

---

## 🚂 Option 3: Deploy to Railway / Koyeb (Docker Container)
A production-ready `Dockerfile` is included in this repository.

1. Go to [railway.app](https://railway.app) or [koyeb.com](https://koyeb.com).
2. Click **Deploy from GitHub repo**.
3. Railway/Koyeb will automatically detect `Dockerfile` and spin up the production container on port 5000.

---

## 🗄️ Option 4: Connect Free Cloud PostgreSQL (Neon / Supabase)
If you want an independent cloud database hosted separately:

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Neon/Supabase and paste the contents of `supabase-schema.sql`. Click **Run**.
3. Copy your database connection string:
   `postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require`
4. On your Render/Railway dashboard, add an Environment Variable:
   - **Key:** `DATABASE_URL`
   - **Value:** *(paste your connection string)*
5. The portal will automatically connect to your cloud database!

---

## ✅ Post-Deployment Verification Checklist
1. Visit your live deployment URL on your mobile phone and laptop.
2. Verify that creator branding: `M. MOHAMED ASKAR | Reg: 240071601159` is visible at the top-left corner.
3. Click **"+ Report an Item"**, upload a photo from your phone, and submit.
4. Refresh the page on another device or computer: the new item and photo will appear immediately from the database!
5. Click **"Claim This Item"**, enter proof, and verify that the claim alert is generated.
