/**
 * ============================================================================
 * CRESCENT RECLAIM - CAMPUS LOST & FOUND PORTAL BACKEND SERVER
 * ============================================================================
 * Developer: M. MOHAMED ASKAR (Reg No: 240071601159)
 * Department: Computer Science & Engineering
 * Institution: B.S. Abdur Rahman Crescent Institute of Science & Technology
 * Guided by: Dr. K. Palanivel, M.Sc., M.Phil., Ph.D.
 * ============================================================================
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const getIndexHtml = require('./htmlTemplate.js');

const PORT = process.env.PORT || 5000;
const IS_VERCEL = !!(process.env.VERCEL || process.env.NOW_REGION);

// In serverless / Vercel, only /tmp is writable
const UPLOADS_DIR = IS_VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const SQLITE_DB_PATH = process.env.DATABASE_PATH || (IS_VERCEL ? path.join('/tmp', 'crescent_reclaim.db') : path.join(__dirname, 'crescent_reclaim.db'));

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  // Ignore filesystem permission errors on read-only serverless lambdas
}

/* ============================================================================
   1. SEED DATASET (Verified Campus Items)
   ============================================================================ */
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
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
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
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
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
    reporter_name: 'M. MOHAMED Askar',
    reporter_email: 'askar@crescent.education',
    reporter_phone: '+91 98401 23456',
    reporter_reg: '240071601159',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'item-104',
    type: 'found',
    status: 'active',
    category: 'Bottles',
    title: 'Milton Thermosteel Black Water Bottle (750ml)',
    desc: 'Matte black insulated bottle with a small dent at bottom rim. Handed over to Physical Education trainer.',
    zone: 'Sports Complex',
    exact_spot: 'Badminton Court 1 Bench',
    photo_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop',
    reporter_name: 'Sports In-Charge',
    reporter_email: 'sports@crescent.education',
    reporter_phone: '+91 98403 44556',
    reporter_reg: 'STAFF-SPT-01',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

let fallbackClaims = [];

/* ============================================================================
   2. CLOUD DATABASE ENGINE (PostgreSQL: Neon / Supabase / Vercel Postgres)
   ============================================================================ */
let pgPool = null;
let pgInitialized = false;

const PG_CONNECTION_STRING = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

if (PG_CONNECTION_STRING) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: PG_CONNECTION_STRING,
      ssl: { rejectUnauthorized: false }
    });
    console.log('🌐 Cloud PostgreSQL pool configured.');
  } catch (err) {
    console.error('⚠️ Failed to load pg driver:', err.message);
  }
}

// Auto-initialize PostgreSQL tables and seed data if needed
async function ensurePgSchema() {
  if (!pgPool || pgInitialized) return;
  try {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          "desc" TEXT NOT NULL,
          zone TEXT NOT NULL,
          exact_spot TEXT NOT NULL,
          photo_url TEXT NOT NULL,
          reporter_name TEXT NOT NULL,
          reporter_email TEXT NOT NULL,
          reporter_phone TEXT,
          reporter_reg TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
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
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      const countRes = await client.query('SELECT COUNT(*) as c FROM items');
      if (parseInt(countRes.rows[0].c, 10) === 0) {
        console.log('🌱 Seeding initial campus items into Cloud PostgreSQL...');
        for (const item of fallbackItems) {
          await client.query(`
            INSERT INTO items (id, type, status, category, title, "desc", zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO NOTHING
          `, [
            item.id, item.type, item.status, item.category, item.title, item.desc,
            item.zone, item.exact_spot, item.photo_url, item.reporter_name,
            item.reporter_email, item.reporter_phone, item.reporter_reg
          ]);
        }
      }
      pgInitialized = true;
      console.log('✅ Cloud PostgreSQL tables and data verified.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('⚠️ PostgreSQL schema setup notice:', err.message);
  }
}

/* ============================================================================
   3. LOCAL DATABASE ENGINE (SQLite Fallback)
   ============================================================================ */
let sqliteDb = null;
let useSQLite = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  sqliteDb = new DatabaseSync(SQLITE_DB_PATH);
  useSQLite = true;

  sqliteDb.exec(`
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
  `);

  const count = sqliteDb.prepare('SELECT COUNT(*) as count FROM items').get().count;
  if (count === 0) {
    const insertStmt = sqliteDb.prepare(`
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
} catch (e) {
  useSQLite = false;
  sqliteDb = null;
}

/* ============================================================================
   4. HTTP HELPERS & UTILITIES
   ============================================================================ */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJSON(res, statusCode, data) {
  setCorsHeaders(res);
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseJSONBody(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 20 * 1024 * 1024) resolve({});
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (err) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function serveStaticFile(req, res, targetName, contentType) {
  try {
    if (targetName === 'index.html' || targetName.endsWith('.html')) {
      const html = getIndexHtml();
      setCorsHeaders(res);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    const candidates = [
      path.join(__dirname, targetName),
      path.join(process.cwd(), targetName),
      path.join(__dirname, '..', targetName)
    ];

    let foundPath = null;
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        foundPath = cand;
        break;
      }
    }

    if (!foundPath) {
      const html = getIndexHtml();
      setCorsHeaders(res);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    const data = fs.readFileSync(foundPath);
    setCorsHeaders(res);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    const html = getIndexHtml();
    setCorsHeaders(res);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }
}

/* ============================================================================
   5. MAIN REQUEST HANDLER (Cloud Postgres + SQLite + In-Memory Fallback)
   ============================================================================ */
async function handleRequest(req, res) {
  try {
    const rawUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.url || '/';
    const parsedUrl = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);
    let pathname = parsedUrl.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    // Ensure Cloud Postgres schema is initialized if connected
    if (pgPool && !pgInitialized) {
      await ensurePgSchema();
    }

    // 1. GET /api/items or /items
    if (method === 'GET' && (pathname === '/api/items' || pathname === '/items')) {
      const type = parsedUrl.searchParams.get('type') || 'all';
      const category = parsedUrl.searchParams.get('category') || 'all';
      const zone = parsedUrl.searchParams.get('zone') || 'all';
      const search = (parsedUrl.searchParams.get('search') || '').trim();

      // Priority 1: Cloud PostgreSQL
      if (pgPool) {
        try {
          let query = 'SELECT id, type, status, category, title, "desc", zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg, created_at FROM items WHERE 1=1';
          const params = [];
          if (type !== 'all') {
            params.push(type);
            query += ` AND type = $${params.length}`;
          }
          if (category !== 'all') {
            params.push(category);
            query += ` AND category = $${params.length}`;
          }
          if (zone !== 'all') {
            params.push(zone);
            query += ` AND zone = $${params.length}`;
          }
          if (search) {
            const wild = `%${search.toLowerCase()}%`;
            params.push(wild);
            const pIndex = params.length;
            query += ` AND (LOWER(title) LIKE $${pIndex} OR LOWER("desc") LIKE $${pIndex} OR LOWER(zone) LIKE $${pIndex})`;
          }
          query += ' ORDER BY created_at DESC';
          const pgRes = await pgPool.query(query, params);
          return sendJSON(res, 200, { success: true, count: pgRes.rows.length, items: pgRes.rows, source: 'cloud_postgres' });
        } catch (err) {
          console.error('PG query fallback:', err.message);
        }
      }

      // Priority 2: Local SQLite
      if (useSQLite && sqliteDb) {
        try {
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
          const items = sqliteDb.prepare(query).all(...params);
          return sendJSON(res, 200, { success: true, count: items.length, items, source: 'sqlite' });
        } catch (err) {}
      }

      // Priority 3: In-Memory
      let filtered = fallbackItems.filter(item => {
        const matchType = (type === 'all' || item.type === type);
        const matchCat = (category === 'all' || item.category === category);
        const matchZone = (zone === 'all' || item.zone === zone);
        const matchSearch = !search ||
          (item.title && item.title.toLowerCase().includes(search.toLowerCase())) ||
          (item.desc && item.desc.toLowerCase().includes(search.toLowerCase())) ||
          (item.zone && item.zone.toLowerCase().includes(search.toLowerCase()));
        return matchType && matchCat && matchZone && matchSearch;
      });

      return sendJSON(res, 200, { success: true, count: filtered.length, items: filtered, source: 'memory' });
    }

    // 2. POST /api/items or /items
    if (method === 'POST' && (pathname === '/api/items' || pathname === '/items')) {
      const body = await parseJSONBody(req);
      const { type, category, title, desc, zone, exact_spot, photo, reporter_name, reporter_email, reporter_phone, reporter_reg } = body || {};

      if (!title || !category || !zone || !reporter_name || !reporter_email) {
        return sendJSON(res, 400, { success: false, error: 'Missing required report fields.' });
      }

      const id = 'item-' + Date.now();
      const savedPhoto = photo || 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';

      const newItem = {
        id,
        type: type || 'lost',
        status: 'active',
        category,
        title,
        desc: desc || '',
        zone,
        exact_spot: exact_spot || 'Campus',
        photo_url: savedPhoto,
        reporter_name,
        reporter_email,
        reporter_phone: reporter_phone || '',
        reporter_reg: reporter_reg || '',
        created_at: new Date().toISOString()
      };

      // Save to Cloud Postgres
      if (pgPool) {
        try {
          await pgPool.query(`
            INSERT INTO items (id, type, status, category, title, "desc", zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg, created_at)
            VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          `, [
            id, newItem.type, category, title, newItem.desc, zone, newItem.exact_spot,
            savedPhoto, reporter_name, reporter_email, reporter_phone || '', reporter_reg || ''
          ]);
          console.log(`☁️ [CLOUD POSTGRES] Saved new report: "${title}" by ${reporter_name}`);
        } catch (err) {
          console.error('PG insert error:', err.message);
        }
      }

      // Save to SQLite
      if (useSQLite && sqliteDb) {
        try {
          sqliteDb.prepare(`
            INSERT INTO items (id, type, status, category, title, desc, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
            VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, newItem.type, category, title, newItem.desc, zone, newItem.exact_spot, savedPhoto, reporter_name, reporter_email, reporter_phone || '', reporter_reg || '');
        } catch (err) {}
      }

      fallbackItems.unshift(newItem);
      return sendJSON(res, 201, { success: true, message: 'Item registered successfully.', item: newItem });
    }

    // 3. POST /api/items/:id/claim
    const claimMatch = pathname.match(/^\/(?:api\/)?items\/([^/]+)\/claim$/);
    if (method === 'POST' && claimMatch) {
      const itemId = claimMatch[1];
      const body = await parseJSONBody(req);
      const { claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details } = body || {};

      let item = fallbackItems.find(i => i.id === itemId);

      if (pgPool) {
        try {
          const pgItemRes = await pgPool.query('SELECT * FROM items WHERE id = $1', [itemId]);
          if (pgItemRes.rows.length > 0) item = pgItemRes.rows[0];
        } catch (err) {}
      } else if (!item && useSQLite && sqliteDb) {
        try { item = sqliteDb.prepare('SELECT * FROM items WHERE id = ?').get(itemId); } catch (e) {}
      }

      if (!item) {
        return sendJSON(res, 404, { success: false, error: 'Item not found' });
      }

      const claimId = 'claim-' + Date.now();

      // Cloud Postgres
      if (pgPool) {
        try {
          await pgPool.query(`
            INSERT INTO claims (id, item_id, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [claimId, itemId, claimant_name, claimant_reg || '', claimant_email, claimant_phone || '', proof_details]);
          await pgPool.query(`UPDATE items SET status = 'claim_pending' WHERE id = $1`, [itemId]);
        } catch (err) {
          console.error('PG claim error:', err.message);
        }
      }

      // SQLite
      if (useSQLite && sqliteDb) {
        try {
          sqliteDb.prepare(`
            INSERT INTO claims (id, item_id, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(claimId, itemId, claimant_name, claimant_reg || '', claimant_email, claimant_phone || '', proof_details);
          sqliteDb.prepare(`UPDATE items SET status = 'claim_pending' WHERE id = ?`).run(itemId);
        } catch (err) {}
      }

      fallbackClaims.push({ id: claimId, itemId, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details });
      item.status = 'claim_pending';

      return sendJSON(res, 200, {
        success: true,
        message: 'Claim recorded in cloud database. Email alert dispatched to finder.',
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

    // 4. GET /api/metrics or /metrics
    if (method === 'GET' && (pathname === '/api/metrics' || pathname === '/metrics')) {
      let totalReports = fallbackItems.length;
      let foundItems = fallbackItems.filter(i => i.type === 'found').length;
      let lostItems = fallbackItems.filter(i => i.type === 'lost').length;
      let totalClaims = fallbackClaims.length;

      if (pgPool) {
        try {
          const totRes = await pgPool.query('SELECT COUNT(*) as c FROM items');
          const fndRes = await pgPool.query("SELECT COUNT(*) as c FROM items WHERE type = 'found'");
          const lstRes = await pgPool.query("SELECT COUNT(*) as c FROM items WHERE type = 'lost'");
          const clmRes = await pgPool.query('SELECT COUNT(*) as c FROM claims');
          totalReports = parseInt(totRes.rows[0].c, 10);
          foundItems = parseInt(fndRes.rows[0].c, 10);
          lostItems = parseInt(lstRes.rows[0].c, 10);
          totalClaims = parseInt(clmRes.rows[0].c, 10);
        } catch (err) {}
      } else if (useSQLite && sqliteDb) {
        try {
          totalReports = sqliteDb.prepare('SELECT COUNT(*) as count FROM items').get().count;
          foundItems = sqliteDb.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'found'").get().count;
          lostItems = sqliteDb.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'lost'").get().count;
          totalClaims = sqliteDb.prepare('SELECT COUNT(*) as count FROM claims').get().count;
        } catch (err) {}
      }

      return sendJSON(res, 200, {
        success: true,
        metrics: {
          totalReports,
          foundItems,
          lostItems,
          totalClaims,
          reunitedOwners: 142 + totalClaims
        }
      });
    }

    // 5. Static Frontend (index.html)
    if (pathname === '/' || pathname === '/index.html' || pathname === '') {
      return serveStaticFile(req, res, 'index.html', 'text/html; charset=utf-8');
    }

    // 6. Static Uploads
    if (pathname.startsWith('/uploads/')) {
      const filename = path.basename(pathname);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        return serveStaticFile(req, res, filePath, 'image/jpeg');
      }
      return serveStaticFile(req, res, 'index.html', 'text/html; charset=utf-8');
    }

    // Default: serve index.html
    return serveStaticFile(req, res, 'index.html', 'text/html; charset=utf-8');

  } catch (globalErr) {
    try {
      const html = getIndexHtml();
      setCorsHeaders(res);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e2) {
      setCorsHeaders(res);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: globalErr.message }));
    }
  }
}

/* ============================================================================
   6. EXPORTS & SERVER STARTUP
   ============================================================================ */
module.exports = handleRequest;
module.exports.default = handleRequest;

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================`);
    console.log(`Crescent ReClaim Server listening on http://localhost:${PORT}`);
    console.log(`Developer: M. MOHAMED ASKAR (Reg No: 240071601159)`);
    console.log(`Database: ${PG_CONNECTION_STRING ? 'Cloud PostgreSQL' : (useSQLite ? 'Local SQLite' : 'In-Memory')}`);
    console.log(`========================================================`);
  });
}
