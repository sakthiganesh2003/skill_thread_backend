const router = require('express').Router();
const { add, update, get, queryCollection, deleteDoc } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/customizations
// Optional query: ?garment_type=shirt&customization_type=collar&active=true
router.get('/', async (req, res) => {
  try {
    const { garment_type, customization_type, active } = req.query;
    const filters = [];

    if (garment_type) filters.push(['garment_type', '==', garment_type]);
    if (customization_type) filters.push(['customization_type', '==', customization_type]);
    if (active === 'true') filters.push(['is_active', '==', true]);

    const customizations = await queryCollection('customizations', filters);
    res.json(customizations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customizations/:id
router.get('/:id', async (req, res) => {
  try {
    const customization = await get('customizations', req.params.id);
    if (!customization) {
      return res.status(404).json({ error: 'Customization option not found' });
    }
    res.json(customization);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customizations (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { garment_type, customization_type, option_name, extra_price, is_active } = req.body;

    if (!garment_type || !customization_type || !option_name) {
      return res.status(400).json({ error: 'garment_type, customization_type, and option_name are required' });
    }

    const customization = await add('customizations', {
      garment_type,
      customization_type,
      option_name,
      extra_price: typeof extra_price === 'number' ? extra_price : 0,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json(customization);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customizations/:id (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { garment_type, customization_type, option_name, extra_price, is_active } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (garment_type !== undefined) updates.garment_type = garment_type;
    if (customization_type !== undefined) updates.customization_type = customization_type;
    if (option_name !== undefined) updates.option_name = option_name;
    if (extra_price !== undefined) updates.extra_price = extra_price;
    if (is_active !== undefined) updates.is_active = is_active;

    await update('customizations', req.params.id, updates);
    const updated = await get('customizations', req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customizations/:id (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await deleteDoc('customizations', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
