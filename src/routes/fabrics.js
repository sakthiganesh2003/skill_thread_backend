const router = require('express').Router();
const { add, set, update, get, queryCollection, deleteDoc } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/fabrics
// Optional query: ?active=true
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    const fabrics = await queryCollection('fabrics', active === 'true' ? [['is_active', '==', true]] : []);
    res.json(fabrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fabrics/:id
router.get('/:id', async (req, res) => {
  try {
    const fabric = await get('fabrics', req.params.id);
    if (!fabric) {
      return res.status(404).json({ error: 'Fabric not found' });
    }
    res.json(fabric);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fabrics (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, type, image_url, price_per_meter, stock_quantity, is_active } = req.body;

    const price = Number(price_per_meter);
    if (!name || isNaN(price)) {
      return res.status(400).json({ error: 'name and a valid price_per_meter are required' });
    }

    const fabric = await add('fabrics', {
      name,
      type: type || '',
      image_url: image_url || null,
      price_per_meter: price,
      stock_quantity: isNaN(Number(stock_quantity)) ? 0 : Number(stock_quantity),
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json(fabric);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/fabrics/:id (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, type, image_url, price_per_meter, stock_quantity, is_active } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (image_url !== undefined) updates.image_url = image_url;
    if (price_per_meter !== undefined) updates.price_per_meter = Number(price_per_meter);
    if (stock_quantity !== undefined) updates.stock_quantity = Number(stock_quantity);
    if (is_active !== undefined) updates.is_active = is_active;

    await update('fabrics', req.params.id, updates);

    const updated = await get('fabrics', req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fabrics/:id (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await deleteDoc('fabrics', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
