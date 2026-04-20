const router = require('express').Router();
const { queryCollection, get, add, update, deleteDoc } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/garments — public, only active
router.get('/', async (req, res) => {
  try {
    const garments = await queryCollection('garments', ['is_active', '==', true]);
    res.json(garments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/garments/all — admin only, all garments including inactive
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const garments = await queryCollection('garments');
    res.json(garments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/garments/:id
router.get('/:id', async (req, res) => {
  try {
    const garment = await get('garments', req.params.id);
    if (!garment) {
      return res.status(404).json({ error: 'Garment not found' });
    }
    res.json(garment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/garments — admin only
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, category, description, base_price, emoji, image_url, fabric_options, customization_options } = req.body;
    if (!name || isNaN(Number(base_price))) {
      return res.status(400).json({ error: 'name and a valid base_price are required' });
    }
    const garment = await add('garments', {
      name,
      category: category || '',
      description: description || '',
      base_price: Number(base_price),
      emoji: emoji || '👔',
      image_url: image_url || '',
      fabric_options: fabric_options || '',
      customization_options: customization_options || '',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    res.status(201).json(garment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/garments/:id — admin only
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, category, description, base_price, emoji, image_url, fabric_options, customization_options, is_active } = req.body;
    const garment = await get('garments', req.params.id);
    if (!garment) {
      return res.status(404).json({ error: 'Garment not found' });
    }
    const updated = await update('garments', req.params.id, {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(base_price !== undefined && { base_price: Number(base_price) }),
      ...(emoji !== undefined && { emoji }),
      ...(image_url !== undefined && { image_url }),
      ...(fabric_options !== undefined && { fabric_options }),
      ...(customization_options !== undefined && { customization_options }),
      ...(is_active !== undefined && { is_active }),
      updated_at: new Date(),
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/garments/:id — admin only (permanent delete)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await deleteDoc('garments', req.params.id);
    res.json({ success: true, message: 'Garment deleted permanently' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
