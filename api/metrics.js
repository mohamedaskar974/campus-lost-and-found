/**
 * Vercel Serverless Function: /api/metrics
 * Developer: M. MOHAMED ASKAR (Reg No: 240071601159)
 */

const serverHandler = require('../server.js');

module.exports = async (req, res) => {
  req.url = '/api/metrics';
  return serverHandler(req, res);
};
