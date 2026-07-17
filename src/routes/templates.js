/**
 * @file src/routes/templates.js
 */

const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/templateController');
const { validate, schemas } = require('../middleware/validateRequest');

router.get('/', getTemplates);
router.get('/:id', getTemplate);
router.post('/', validate(schemas.createTemplate), createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
