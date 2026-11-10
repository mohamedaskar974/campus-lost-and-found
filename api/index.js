/**
 * Vercel Serverless Function Adapter for Crescent ReClaim
 * Handles /api/items, /api/items/:id/claim, /api/metrics
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// In serverless, use /tmp for SQLite database if no remote DB is provided
const DB_PATH = process.env.DATABASE_PATH || '/tmp/crescent_reclaim.db';

let db;
function getDatabase() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed sample data if empty
    const count = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
    if (count === 0) {
      const stmt = db.prepare(`
        INSERT INTO items (id, type, status, category, title, desc, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
        VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run('item-101', 'found', 'Electronics', 'Casio fx-991EX Classwiz Calculator', 'Found on study table in silent reading zone.', 'Central Library', '2nd Floor Table 14', 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop', 'Dr. K. Palanivel / Librarian Desk', 'library.desk@crescent.education', '+91 98401 22334', 'FAC-LIB-04');
      stmt.run('item-102', 'found', 'Cards', 'Crescent Student ID Card (II B.Sc CS)', 'Blue lanyard with Crescent crest.', 'Main Canteen', 'Juice Counter Table', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop', 'Canteen Supervisor', 'canteen@crescent.education', '+91 98402 99881', 'STAFF-CAN-02');
      stmt.run('item-103', 'lost', 'Keys', 'Yamaha Bike Keys with Crescent Lanyard', 'Set of 2 keys with black rubber head.', 'Campus Parking', 'Gate 2 Shed', 'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=600&auto=format&fit=crop', 'M. Mohaed Askar', 'askar@crescent.education', '+91 98401 23456', '240071601159');
    }
  }
  return db;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const database = getDatabase();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/^\/api/, '');

  // 1. GET /api/items
  if (req.method === 'GET' && (pathname === '/items' || pathname === '')) {
    const type = parsedUrl.searchParams.get('type') || 'all';
    const category = parsedUrl.searchParams.get('category') || 'all';
    const zone = parsedUrl.searchParams.get('zone') || 'all';
    const search = (parsedUrl.searchParams.get('search') || '').trim();

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

    const items = database.prepare(query).all(...params);
    return res.status(200).json({ success: true, count: items.length, items });
  }

  // 2. POST /api/items
  if (req.method === 'POST' && (pathname === '/items' || pathname === '')) {
    const body = req.body || {};
    const { type, category, title, desc, zone, exact_spot, photo, reporter_name, reporter_email, reporter_phone, reporter_reg } = body;

    const id = 'item-' + Date.now();
    const photoUrl = photo || 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';

    database.prepare(`
      INSERT INTO items (id, type, status, category, title, desc, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
      VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type || 'lost', category, title, desc || '', zone, exact_spot || '', photoUrl, reporter_name, reporter_email, reporter_phone || '', reporter_reg || '');

    const newItem = database.prepare('SELECT * FROM items WHERE id = ?').get(id);
    return res.status(201).json({ success: true, item: newItem });
  }

  // 3. POST /api/items/:id/claim
  const claimMatch = pathname.match(/^\/items\/([^/]+)\/claim$/);
  if (req.method === 'POST' && claimMatch) {
    const itemId = claimMatch[1];
    const { claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details } = req.body || {};
    const item = database.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

    const claimId = 'claim-' + Date.now();
    database.prepare(`
      INSERT INTO claims (id, item_id, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(claimId, itemId, claimant_name, claimant_reg || '', claimant_email, claimant_phone || '', proof_details);

    return res.status(200).json({
      success: true,
      message: 'Claim recorded successfully',
      claimId,
      emailAlert: {
        to: item.reporter_email,
        toName: item.reporter_name,
        subject: `[Crescent ReClaim Alert] Claim Filed for: ${item.title}`,
        claimantName: claimant_name,
        proofDetails: proof_details
      }
    });
  }

  // 4. GET /api/metrics
  if (req.method === 'GET' && pathname === '/metrics') {
    const total = database.prepare('SELECT COUNT(*) as c FROM items').get().c;
    const found = database.prepare("SELECT COUNT(*) as c FROM items WHERE type = 'found'").get().c;
    const lost = database.prepare("SELECT COUNT(*) as c FROM items WHERE type = 'lost'").get().c;
    const claims = database.prepare('SELECT COUNT(*) as c FROM claims').get().c;

    return res.status(200).json({
      success: true,
      metrics: {
        totalReports: total,
        foundItems: found,
        lostItems: lost,
        totalClaims: claims,
        reunitedOwners: 142 + claims
      }
    });
  }

  return res.status(404).json({ error: 'Endpoint not found' });
};
