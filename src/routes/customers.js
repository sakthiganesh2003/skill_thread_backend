const router = require('express').Router();
const { add, update, get, queryCollection, findOne } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/customers (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const customers = await queryCollection('users', [['role', '==', 'customer']], [['created_at', 'desc']]);
    
    // Enrich customers with measurement status
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const measurements = await findOne('measurements', [['user_id', '==', customer.id]]);
        return {
          id: customer.id,
          email: customer.email,
          phone: customer.phone,
          address: customer.address || '',
          has_measurements: !!measurements,
          created_at: customer.created_at,
          is_active: customer.is_active !== false
        };
      })
    );
    
    res.json(enrichedCustomers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id (admin only)
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const customer = await get('users', req.params.id);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || '',
      is_active: customer.is_active !== false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;
    
    // Check if email exists
    const existing = await findOne('users', [['email', '==', email]]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password || 'Customer@123', 10);
    
    const user = await add('users', {
      name,
      email,
      phone: phone || '',
      address: address || '',
      password_hash,
      role: 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json({ id: user.id, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, address, is_active } = req.body;
    
    await update('users', req.params.id, {
      name,
      phone,
      address: address || '',
      is_active,
      updated_at: new Date().toISOString()
    });

    res.json({ message: 'Customer updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await update('users', req.params.id, {
      is_active: false,
      updated_at: new Date().toISOString()
    });
    res.json({ message: 'Customer deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
