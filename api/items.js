/**
 * Vercel Serverless Function: /api/items
 * Developer: M. MOHAMED ASKAR (Reg No: 240071601159)
 */

const serverHandler = require('../server.js');

module.exports = async (req, res) => {
  const queryPart = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  req.url = '/api/items' + queryPart;
  return serverHandler(req, res);
};
