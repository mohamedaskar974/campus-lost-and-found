/**
 * Vercel Serverless Function API Handler for Crescent ReClaim
 * Developer: M. MOHAMED ASKAR (Reg No: 240071601159)
 * Crescent Institute of Science & Technology
 * Guided by: Dr. K. Palanivel, M.Sc., M.Phil., Ph.D.
 */

const serverHandler = require('../server.js');

module.exports = async (req, res) => {
  return serverHandler(req, res);
};
