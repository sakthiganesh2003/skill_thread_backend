const router = require('express').Router();
const { add, set, update, get, queryCollection, findOne, deleteDoc } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// PUT /api/measurements/mine
router.put('/mine', authenticate, async (req, res) => {
  try {
    const { chest, waist, hip, shoulder, sleeve_length, height, neck, inseam, notes, shirt_length, pant_length } = req.body;

    const existing = await findOne('measurements', [['user_id', '==', req.user.id]]);

    const measurementData = {
      user_id: req.user.id,
      chest,
      waist,
      hip,
      shoulder,
      sleeve_length,
      height,
      neck,
      inseam,
      shirt_length,
      pant_length,
      notes,
      updated_at: new Date()
    };

    if (existing) {
      await update('measurements', existing.id, measurementData);
    } else {
      measurementData.created_at = new Date();
      await add('measurements', measurementData);
    }

    res.json({ message: 'Measurements saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/measurements/mine
router.get('/mine', authenticate, async (req, res) => {
  try {
    const measurements = await findOne('measurements', [['user_id', '==', req.user.id]]);
    res.json(measurements || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/measurements/user/:userId (admin/tailor only)
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    console.log(`[GET /measurements/user/${req.params.userId}] User:`, req.user.id, 'Role:', req.user.role);
    
    // Both admin and tailor should be able to see measurements
    if (req.user.role !== 'admin' && req.user.role !== 'tailor' && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const measurements = await findOne('measurements', [['user_id', '==', req.params.userId]]);
    res.json(measurements || {});
  } catch (err) {
    console.error('Error fetching measurements for user:', err);
    res.status(500).json({ error: err.message });
  }
});


// PUT /api/measurements/user/:userId (admin only)
router.put('/user/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { chest, waist, hip, shoulder, sleeve_length, height, neck, inseam, notes, shirt_length, pant_length } = req.body;

    const existing = await findOne('measurements', [['user_id', '==', req.params.userId]]);

    const measurementData = {
      user_id: req.params.userId,
      chest,
      waist,
      hip,
      shoulder,
      sleeve_length,
      height,
      neck,
      inseam,
      shirt_length,
      pant_length,
      notes,
      updated_at: new Date()
    };

    if (existing) {
      await update('measurements', existing.id, measurementData);
    } else {
      measurementData.created_at = new Date();
      await add('measurements', measurementData);
    }

    res.json({ message: 'Measurements updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
