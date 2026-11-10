# Crescent ReClaim — Campus Lost & Found Portal

**Author:** M. MOHAED ASKAR  
**Reg No:** 240071601159  
**Degree:** II B.Sc. Computer Science  
**Institution:** B.S. Abdur Rahman Crescent Institute of Science & Technology  
**Faculty Guide:** Dr. K. Palanivel, M.Sc., M.Phil., Ph.D., N.E.T., Assistant Professor  

---

## 🌟 Overview
Crescent ReClaim is a full-stack campus web portal designed to replace messy, buried WhatsApp group messages with a centralized, verified recovery system for lost and found student belongings (Calculators, ID cards, Bike keys, Water bottles, Notebooks, Headphones).

---

## 🗄️ Backend Architecture

### 1. Node.js + SQLite Production Engine (Ready-to-Run)
* **Runtime:** Node.js (Built-in HTTP & native `node:sqlite` database engine)
* **Zero Dependencies:** Runs out-of-the-box on your machine without requiring `npm install` or external database services.
* **Database File:** `crescent_reclaim.db` (Persistent relational SQLite database)
* **Uploads Directory:** `./uploads` (Local file storage for item photos)

### 2. Relational Database Tables
* **`items` Table:**
  * `id` (VARCHAR PK)
  * `type` ('lost' or 'found')
  * `status` ('active', 'claim_pending', 'reunited')
  * `category` (Electronics, Cards, Keys, Bottles, Stationery, Bags)
  * `title`, `desc`, `zone`, `exact_spot`, `photo_url`
  * `reporter_name`, `reporter_email`, `reporter_phone`, `reporter_reg`
  * `created_at` (TIMESTAMP)
* **`claims` Table:**
  * `id` (VARCHAR PK)
  * `item_id` (FK to `items.id`)
  * `claimant_name`, `claimant_reg`, `claimant_email`, `claimant_phone`
  * `proof_details` (Unique identifying details submitted by student)
  * `status`, `created_at`
* **`email_logs` Table:**
  * `id` (INTEGER AUTOINCREMENT PK)
  * `recipient_email`, `recipient_name`, `subject`, `item_title`, `body_html`
  * `sent_at` (TIMESTAMP)

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/items` | Fetch all reports with query filters (`?type=...&category=...&zone=...&search=...&sort=...`) |
| `POST` | `/api/items` | Log a new lost/found report with photo storage |
| `POST` | `/api/items/:id/claim` | File a verified claim & trigger automated email alert to finder |
| `GET` | `/api/metrics` | Real-time database metrics (total reports, active found, reunited count) |
| `GET` | `/api/emails` | Outgoing email alert audit logs |
| `PATCH`| `/api/items/:id/resolve` | Mark an item as reunited with owner |

---

## 🚀 How to Run the Backend

### Method 1: One-Click Windows Launch
Double-click:
```
start-server.bat
```
*(This automatically boots the SQLite database server and opens `http://localhost:5000` in your browser).*

### Method 2: Command Line
Open terminal in `campus-lost-and-found` and run:
```bash
node server.js
```
Then visit: `http://localhost:5000`

---

## 🐘 PHP & MySQL Alternative (For Academic Submission)
If you need to submit PHP & MySQL code to Dr. K. Palanivel as per your internship syllabus, the complete PHP backend files are included in the `php-backend/` folder:
* `php-backend/database.sql` — MySQL database creation and table schemas.
* `php-backend/config.php` — PDO MySQL connection script.
* `php-backend/api.php` — Complete PHP REST API handling items, claims, and metrics.
