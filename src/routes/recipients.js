/**
 * @file src/routes/recipients.js
 */

const express = require('express');
const router = express.Router();
const {
  createRecipient,
  getRecipients,
  getRecipient,
  updateRecipient,
  deleteRecipient,
  researchRecipient,
} = require('../controllers/recipientController');
const { validate, schemas } = require('../middleware/validateRequest');

router.post('/', validate(schemas.createRecipient), createRecipient);
router.get('/', getRecipients);
router.get('/:id', getRecipient);
router.put('/:id', validate(schemas.updateRecipient), updateRecipient);
router.delete('/:id', deleteRecipient);
router.post('/:id/research', researchRecipient);

module.exports = router;
