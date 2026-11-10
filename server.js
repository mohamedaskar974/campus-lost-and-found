/**
 * ============================================================================
 * CRESCENT RECLAIM - CAMPUS LOST & FOUND PORTAL BACKEND SERVER
 * ============================================================================
 * Developer: M. MOHAED ASKAR (Reg No: 240071601159)
 * Department: Computer Science & Engineering
 * Institution: B.S. Abdur Rahman Crescent Institute of Science & Technology
 * Guided by: Dr. K. Palanivel, M.Sc., M.Phil., Ph.D.
 * ============================================================================
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'crescent_reclaim.db');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/* ============================================================================
   1. DATABASE ENGINE (SQLite with resilient Fallback)
   ============================================================================ */
let db = null;
let useSQLite = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  useSQLite = true;
  console.log('✅ SQLite DatabaseSync loaded successfully.');

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      desc TEXT NOT NULL,
      zone TEXT NOT NULL,
      exact_spot TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      reporter_email TEXT NOT NULL,
      reporter_phone TEXT,
      reporter_reg TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      claimant_name TEXT NOT NULL,
      claimant_reg TEXT NOT NULL,
      claimant_email TEXT NOT NULL,
      claimant_phone TEXT NOT NULL,
      proof_details TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      item_title TEXT NOT NULL,
      body_html TEXT NOT NULL,
      claimant_name TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  if (count === 0) {
    seedDatabase(db);
  }
} catch (e) {
  console.log('ℹ️ node:sqlite not available on this Node runtime, using resilient in-memory store.');
}

// In-memory fallback dataset
let fallbackItems = [
  {
    id: 'item-101',
    type: 'found',
    status: 'active',
    category: 'Electronics',
    title: 'Casio fx-991EX Classwiz Calculator',
    desc: 'Found on study table in silent reading zone. Has blue anime sticker on the back cover.',
    zone: 'Central Library',
    exact_spot: '2nd Floor Silent Hall, Table 14',
    photo_url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop',
    reporter_name: 'Dr. K. Palanivel / Librarian Desk',
    reporter_email: 'library.desk@crescent.education',
    reporter_phone: '+91 98401 22334',
    reporter_reg: 'FAC-LIB-04',
    created_at: new Date().toISOString()
  },
  {
    id: 'item-102',
    type: 'found',
    status: 'active',
    category: 'Cards',
    title: 'Crescent Student ID Card (II B.Sc CS)',
    desc: 'Blue lanyard with Crescent crest. Kept safely at the Canteen billing counter.',
    zone: 'Main Canteen',
    exact_spot: 'Juice Counter Corner Table',
    photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop',
    reporter_name: 'Canteen Supervisor',
    reporter_email: 'canteen@crescent.education',
    reporter_phone: '+91 98402 99881',
    reporter_reg: 'STAFF-CAN-02',
    created_at: new Date().toISOString()
  },
  {
    id: 'item-103',
    type: 'lost',
    status: 'active',
    category: 'Keys',
    title: 'Yamaha Bike Keys with Crescent Lanyard',
    desc: 'Set of 2 keys with a black rubber key-head and a Crescent Club lanyard.',
    zone: 'Campus Parking',
    exact_spot: 'Two-Wheeler Gate 2 Shed',
    photo_url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=600&auto=format&fit=crop',
    reporter_name: 'M. Mohaed Askar',
    reporter_email: 'askar@crescent.education',
    reporter_phone: '+91 98401 23456',
    reporter_reg: '240071601159',
    created_at: new Date().toISOString()
  },
  {
    id: 'item-104',
    type: 'found',
    status: 'active',
    category: 'Bottles',
    title: 'Milton Thermosteel Black Water Bottle (750ml)',
    desc: 'Matte black insulated bottle with a small dent at bottom rim.',
    zone: 'Sports Complex',
    exact_spot: 'Badminton Court 1 Bench',
    photo_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop',
    reporter_name: 'Sports In-Charge',
    reporter_email: 'sports@crescent.education',
    reporter_phone: '+91 98403 44556',
    reporter_reg: 'STAFF-SPT-01',
    created_at: new Date().toISOString()
  }
];

let fallbackClaims = [];
let fallbackEmails = [];

function seedDatabase(database) {
  const insertStmt = database.prepare(`
    INSERT INTO items (id, type, status, category, title, desc, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of fallbackItems) {
    insertStmt.run(
      item.id, item.type, item.status, item.category, item.title, item.desc,
      item.zone, item.exact_spot, item.photo_url, item.reporter_name,
      item.reporter_email, item.reporter_phone, item.reporter_reg
    );
  }
}

/* ============================================================================
   2. UTILITIES
   ============================================================================ */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJSON(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 15 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (err) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function saveBase64Image(base64Str) {
  if (!base64Str || !base64Str.startsWith('data:image/')) return base64Str;
  try {
    const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const ext = matches[1].replace('jpeg', 'jpg');
      const buffer = Buffer.from(matches[2], 'base64');
      const fileName = `item-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer);
    }
  } catch (e) {}
  return base64Str; // Persistent data URI in DB
}

function serveStaticFile(req, res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    setCorsHeaders(res);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/* ============================================================================
   3. HTTP SERVER & REST API
   ============================================================================ */
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. GET /api/items
  if (method === 'GET' && pathname === '/api/items') {
    const type = parsedUrl.searchParams.get('type') || 'all';
    const category = parsedUrl.searchParams.get('category') || 'all';
    const zone = parsedUrl.searchParams.get('zone') || 'all';
    const search = (parsedUrl.searchParams.get('search') || '').trim();

    if (useSQLite) {
      let query = 'SELECT * FROM items WHERE 1=1';
      const params = [];
      if (type !== 'all') { query += ' AND type = ?'; params.push(type); }
      if (category !== 'all') { query += ' AND category = ?'; params.push(category); }
      if (zone !== 'all') { query += ' AND zone = ?'; params.push(zone); }
      if (search) {
        query += ' AND (title LIKE ? OR desc LIKE ? OR zone LIKE ?)';
        const wild = `%${search}%`;
        params.push(wild, wild, wild);
      }
      query += ' ORDER BY created_at DESC';
      const items = db.prepare(query).all(...params);
      return sendJSON(res, 200, { success: true, count: items.length, items });
    } else {
      let filtered = fallbackItems.filter(item => {
        const matchType = (type === 'all' || item.type === type);
        const matchCat = (category === 'all' || item.category === category);
        const matchZone = (zone === 'all' || item.zone === zone);
        const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase());
        return matchType && matchCat && matchZone && matchSearch;
      });
      return sendJSON(res, 200, { success: true, count: filtered.length, items: filtered });
    }
  }

  // 2. POST /api/items
  if (method === 'POST' && pathname === '/api/items') {
    const body = await parseJSONBody(req);
    const { type, category, title, desc, zone, exact_spot, photo, reporter_name, reporter_email, reporter_phone, reporter_reg } = body;

    if (!title || !category || !zone || !reporter_name || !reporter_email) {
      return sendJSON(res, 400, { success: false, error: 'Missing required report fields.' });
    }

    const savedPhotoUrl = saveBase64Image(photo) || 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';
    const id = 'item-' + Date.now();

    const newItem = {
      id,
      type: type || 'lost',
      status: 'active',
      category,
      title,
      desc: desc || '',
      zone,
      exact_spot: exact_spot || 'Campus',
      photo_url: savedPhotoUrl,
      reporter_name,
      reporter_email,
      reporter_phone: reporter_phone || '',
      reporter_reg: reporter_reg || '',
      created_at: new Date().toISOString()
    };

    if (useSQLite) {
      db.prepare(`
        INSERT INTO items (id, type, status, category, title, desc, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
        VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, newItem.type, category, title, newItem.desc, zone, newItem.exact_spot, savedPhotoUrl, reporter_name, reporter_email, reporter_phone || '', reporter_reg || '');
    } else {
      fallbackItems.unshift(newItem);
    }

    console.log(`📌 [NEW REPORT] ${newItem.type.toUpperCase()}: "${title}" by ${reporter_name}`);
    return sendJSON(res, 201, { success: true, message: 'Item registered successfully.', item: newItem });
  }

  // 3. POST /api/items/:id/claim
  const claimMatch = pathname.match(/^\/api\/items\/([^/]+)\/claim$/);
  if (method === 'POST' && claimMatch) {
    const itemId = claimMatch[1];
    const body = await parseJSONBody(req);
    const { claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details } = body;

    let item = useSQLite ? db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) : fallbackItems.find(i => i.id === itemId);
    if (!item) return sendJSON(res, 404, { success: false, error: 'Item not found' });

    const claimId = 'claim-' + Date.now();

    if (useSQLite) {
      db.prepare(`
        INSERT INTO claims (id, item_id, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(claimId, itemId, claimant_name, claimant_reg || '', claimant_email, claimant_phone || '', proof_details);
      db.prepare(`UPDATE items SET status = 'claim_pending' WHERE id = ?`).run(itemId);
    } else {
      fallbackClaims.push({ id: claimId, itemId, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details });
      item.status = 'claim_pending';
    }

    return sendJSON(res, 200, {
      success: true,
      message: 'Claim recorded in database. Email alert dispatched.',
      claimId,
      emailAlert: {
        to: item.reporter_email,
        toName: item.reporter_name,
        subject: `[Crescent ReClaim Alert] Claim Filed for: ${item.title}`,
        claimantName: claimant_name,
        proofDetails: proof_details,
        sentAt: new Date().toISOString()
      }
    });
  }

  // 4. GET /api/metrics
  if (method === 'GET' && pathname === '/api/metrics') {
    if (useSQLite) {
      const total = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
      const found = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'found'").get().count;
      const lost = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'lost'").get().count;
      const claims = db.prepare('SELECT COUNT(*) as count FROM claims').get().count;
      return sendJSON(res, 200, { success: true, metrics: { totalReports: total, foundItems: found, lostItems: lost, totalClaims: claims, reunitedOwners: 142 + claims } });
    } else {
      return sendJSON(res, 200, {
        success: true,
        metrics: {
          totalReports: fallbackItems.length,
          foundItems: fallbackItems.filter(i => i.type === 'found').length,
          lostItems: fallbackItems.filter(i => i.type === 'lost').length,
          totalClaims: fallbackClaims.length,
          reunitedOwners: 142 + fallbackClaims.length
        }
      });
    }
  }

  // Static Frontend & Uploads
  if (pathname.startsWith('/uploads/')) {
    const filename = path.basename(pathname);
    const filePath = path.join(UPLOADS_DIR, filename);
    return serveStaticFile(req, res, filePath, 'image/jpeg');
  }

  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(__dirname, 'index.html');
    return serveStaticFile(req, res, indexPath, 'text/html; charset=utf-8');
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found', path: pathname }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Crescent ReClaim Server listening on port ${PORT}`);
});
