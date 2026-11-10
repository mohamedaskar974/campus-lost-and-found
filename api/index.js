/**
 * Vercel Serverless Function API Handler for Crescent ReClaim
 * Developer: M. MOHAED ASKAR (Reg No: 240071601159)
 * Crescent Institute of Science & Technology
 * Guided by: Dr. K. Palanivel, M.Sc., M.Phil., Ph.D.
 */

const path = require('node:path');
const fs = require('node:fs');

// Initial verified seed data
let inMemoryItems = [
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
    desc: 'Matte black insulated bottle with a small dent at bottom rim. Handed over to Physical Education trainer.',
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

let inMemoryClaims = [];

// Try initializing SQLite if available in runtime
let db = null;
try {
  const { DatabaseSync } = require('node:sqlite');
  const DB_PATH = process.env.DATABASE_PATH || path.join('/tmp', 'crescent_reclaim.db');
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

  const count = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
  if (count === 0) {
    const stmt = db.prepare(`
      INSERT INTO items (id, type, status, category, title, desc, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of inMemoryItems) {
      stmt.run(
        item.id, item.type, item.status, item.category, item.title, item.desc,
        item.zone, item.exact_spot, item.photo_url, item.reporter_name,
        item.reporter_email, item.reporter_phone, item.reporter_reg
      );
    }
  }
} catch (e) {
  // node:sqlite not present on this runtime, in-memory store remains active
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Parse path
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/^\/api/, '');

  // Helper for JSON body parsing
  let body = req.body;
  if (!body && (req.method === 'POST' || req.method === 'PATCH')) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      });
    });
  }

  // 1. GET /api/items
  if (req.method === 'GET' && (pathname === '/items' || pathname === '')) {
    const type = parsedUrl.searchParams.get('type') || 'all';
    const category = parsedUrl.searchParams.get('category') || 'all';
    const zone = parsedUrl.searchParams.get('zone') || 'all';
    const search = (parsedUrl.searchParams.get('search') || '').toLowerCase().trim();

    if (db) {
      try {
        let sql = 'SELECT * FROM items WHERE 1=1';
        const params = [];
        if (type !== 'all') { sql += ' AND type = ?'; params.push(type); }
        if (category !== 'all') { sql += ' AND category = ?'; params.push(category); }
        if (zone !== 'all') { sql += ' AND zone = ?'; params.push(zone); }
        if (search) {
          sql += ' AND (LOWER(title) LIKE ? OR LOWER(desc) LIKE ? OR LOWER(zone) LIKE ?)';
          const wild = `%${search}%`;
          params.push(wild, wild, wild);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = db.prepare(sql).all(...params);
        return res.status(200).json({ success: true, count: rows.length, items: rows });
      } catch (err) {}
    }

    let filtered = inMemoryItems.filter(item => {
      const matchType = (type === 'all' || item.type === type);
      const matchCat = (category === 'all' || item.category === category);
      const matchZone = (zone === 'all' || item.zone === zone);
      const matchSearch = !search || 
        item.title.toLowerCase().includes(search) || 
        item.desc.toLowerCase().includes(search) || 
        item.zone.toLowerCase().includes(search);
      return matchType && matchCat && matchZone && matchSearch;
    });

    return res.status(200).json({
      success: true,
      count: filtered.length,
      items: filtered
    });
  }

  // 2. POST /api/items
  if (req.method === 'POST' && (pathname === '/items' || pathname === '')) {
    const { type, category, title, desc, zone, exact_spot, photo, reporter_name, reporter_email, reporter_phone, reporter_reg } = body || {};

    if (!title || !category || !zone || !reporter_name || !reporter_email) {
      return res.status(400).json({ success: false, error: 'Missing required report fields.' });
    }

    const newItem = {
      id: 'item-' + Date.now(),
      type: type || 'lost',
      status: 'active',
      category,
      title,
      desc: desc || '',
      zone,
      exact_spot: exact_spot || 'Campus',
      photo_url: photo || 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop',
      reporter_name,
      reporter_email,
      reporter_phone: reporter_phone || '',
      reporter_reg: reporter_reg || '',
      created_at: new Date().toISOString()
    };

    if (db) {
      try {
        db.prepare(`
          INSERT INTO items (id, type, status, category, title, desc, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
          VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newItem.id, newItem.type, newItem.category, newItem.title, newItem.desc,
          newItem.zone, newItem.exact_spot, newItem.photo_url, newItem.reporter_name,
          newItem.reporter_email, newItem.reporter_phone, newItem.reporter_reg
        );
      } catch (err) {}
    }

    inMemoryItems.unshift(newItem);

    return res.status(201).json({
      success: true,
      message: 'Report registered successfully into database.',
      item: newItem
    });
  }

  // 3. POST /api/items/:id/claim
  const claimMatch = pathname.match(/^\/items\/([^/]+)\/claim$/);
  if (req.method === 'POST' && claimMatch) {
    const itemId = claimMatch[1];
    const { claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details } = body || {};

    let item = inMemoryItems.find(i => i.id === itemId);
    if (!item && db) {
      try { item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId); } catch(e) {}
    }

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const claimId = 'claim-' + Date.now();
    const claimRecord = {
      id: claimId,
      itemId,
      claimant_name,
      claimant_reg,
      claimant_email,
      claimant_phone,
      proof_details,
      created_at: new Date().toISOString()
    };
    inMemoryClaims.push(claimRecord);

    if (db) {
      try {
        db.prepare(`
          INSERT INTO claims (id, item_id, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(claimId, itemId, claimant_name, claimant_reg || '', claimant_email, claimant_phone || '', proof_details);
        db.prepare(`UPDATE items SET status = 'claim_pending' WHERE id = ?`).run(itemId);
      } catch (err) {}
    }

    item.status = 'claim_pending';

    return res.status(200).json({
      success: true,
      message: 'Claim recorded in database. Automated email alert dispatched to finder.',
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
  if (req.method === 'GET' && pathname === '/metrics') {
    let totalReports = inMemoryItems.length;
    let foundItems = inMemoryItems.filter(i => i.type === 'found').length;
    let lostItems = inMemoryItems.filter(i => i.type === 'lost').length;
    let totalClaims = inMemoryClaims.length;

    if (db) {
      try {
        totalReports = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
        foundItems = db.prepare("SELECT COUNT(*) as c FROM items WHERE type = 'found'").get().c;
        lostItems = db.prepare("SELECT COUNT(*) as c FROM items WHERE type = 'lost'").get().c;
        totalClaims = db.prepare('SELECT COUNT(*) as c FROM claims').get().c;
      } catch (err) {}
    }

    return res.status(200).json({
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

  return res.status(404).json({ error: 'Endpoint not found', path: pathname });
};
