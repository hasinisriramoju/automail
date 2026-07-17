/**
 * @file src/routes/profile.js
 * @description API routes for reading and writing the OnIT India company profile.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const PROFILE_PATH = path.join(__dirname, '../config/onitProfile.js');

// GET /api/profile
router.get('/', (req, res, next) => {
  try {
    // Delete require cache to ensure we get the fresh content from disk
    delete require.cache[require.resolve('../config/onitProfile')];
    const profile = require('../config/onitProfile');
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile
router.put('/', (req, res, next) => {
  try {
    const updatedProfile = req.body;
    
    // Simple validation
    if (!updatedProfile.companyName || !updatedProfile.email) {
      return res.status(400).json({ success: false, error: 'Company Name and Email are required' });
    }

    // Prepare content to write
    const fileContent = `/**
 * @file src/config/onitProfile.js
 * @description OnIT India — Sender Profile (Dynamically Updated via Web UI)
 */

const onitProfile = ${JSON.stringify(updatedProfile, null, 2)};

module.exports = onitProfile;
`;

    // Write file back to disk
    fs.writeFileSync(PROFILE_PATH, fileContent, 'utf8');
    logger.info('[Profile] Branding profile updated successfully via Dashboard API');

    res.json({ success: true, message: 'Branding profile updated successfully', data: updatedProfile });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
