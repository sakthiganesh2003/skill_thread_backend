const router = require('express').Router();
const { add, set, update, get, queryCollection, findOne, deleteDoc } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/tailors (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const tailors = await queryCollection('users', [['role', '==', 'tailor']], [['created_at', 'desc']]);
    const enrichedTailors = await Promise.all(
      tailors.map(async (tailor) => {
        const profile = await findOne('tailor_profiles', [['user_id', '==', tailor.id]]);
        return {
          id: tailor.id,
          name: tailor.name,
          email: tailor.email,
          phone: tailor.phone,
          specializations: Array.isArray(profile?.specializations) ? profile.specializations : [],
          experience_years: profile?.experience_years || 0,
          bio: profile?.bio || '',
          rating: profile?.rating || 0,
          total_orders: profile?.total_orders || 0,
          active_orders: profile?.active_orders || 0,
          max_capacity: profile?.max_capacity || 5,
          is_active: tailor.is_active !== false
        };
      })
    );
    res.json(enrichedTailors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tailors (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, phone, password, specializations, max_capacity, experience_years, bio } = req.body;
    
    // Create User
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password || 'Tailor@123', 10);
    
    const user = await add('users', {
      name,
      email,
      phone: phone || '',
      password_hash,
      role: 'tailor',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Create Tailor Profile
    await add('tailor_profiles', {
      user_id: user.id,
      specializations: specializations || [],
      rating: 0,
      total_orders: 0,
      active_orders: 0,
      max_capacity: max_capacity || 5,
      experience_years: parseInt(experience_years) || 0,
      bio: bio || ''
    });

    res.status(201).json({ id: user.id, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tailors/:id (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, specializations, max_capacity, is_active, experience_years, bio } = req.body;
    
    await update('users', req.params.id, {
      name,
      phone,
      is_active,
      updated_at: new Date().toISOString()
    });

    if (profile) {
      await update('tailor_profiles', profile.id, {
        specializations,
        max_capacity,
        experience_years: parseInt(experience_years) || 0,
        bio: bio || ''
      });
    }

    res.json({ message: 'Tailor updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tailors/:id (admin only) - Soft Delete
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await update('users', req.params.id, { is_active: false });
    res.json({ message: 'Tailor deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
