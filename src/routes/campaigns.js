/**
 * @file src/routes/campaigns.js
 */

const express = require('express');
const router = express.Router();
const {
  createCampaign,
  getCampaigns,
  getCampaign,
  generateDrafts,
  startCampaign,
  pause,
  deleteCampaign,
} = require('../controllers/campaignController');
const { validate, schemas } = require('../middleware/validateRequest');

router.post('/', validate(schemas.createCampaign), createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.post('/:id/generate', generateDrafts);
router.post('/:id/start', startCampaign);
router.post('/:id/pause', pause);
router.delete('/:id', deleteCampaign);

module.exports = router;
