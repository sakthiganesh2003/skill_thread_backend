const router = require('express').Router();
const { add, set, update, get, queryCollection, findOne, deleteDoc } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// Helper function to enrich order with related data
async function enrichOrder(order) {
  const garment = await get('garments', order.garment_id);
  const customer = await get('users', order.customer_id);
  let tailor = null;
  if (order.tailor_id) {
    tailor = await get('users', order.tailor_id);
  }

  return {
    ...order,
    garment_name: garment?.name,
    emoji: garment?.emoji,
    image_url: garment?.image_url,
    customer_name: customer?.name,
    customer_phone: customer?.phone,
    tailor_name: tailor?.name
  };
}

// GET /api/orders
router.get('/', authenticate, async (req, res) => {
  try {
    let orders = [];

    if (req.user.role === 'customer') {
      orders = await queryCollection('orders', [['customer_id', '==', req.user.id]], [['created_at', 'desc']]);
    } else if (req.user.role === 'tailor') {
      orders = await queryCollection('orders', [['tailor_id', '==', req.user.id]], [['due_date', 'asc']]);
    } else {
      orders = await queryCollection('orders', [], [['created_at', 'desc']]);
    }

    // Enrich orders with related data (garment, customer, tailor names)
    const enrichedOrders = await Promise.all(orders.map(enrichOrder));
    res.json(enrichedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await get('orders', req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Access control
    if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'tailor' && order.tailor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch related data
    const garment = await get('garments', order.garment_id);
    const customer = await get('users', order.customer_id);
    let tailor = null;
    if (order.tailor_id) {
      tailor = await get('users', order.tailor_id);
    }

    const measurements = await findOne('measurements', [['user_id', '==', order.customer_id]]);

    const history = await queryCollection('order_status_history', [['order_id', '==', order.id]], [['created_at', 'asc']]);

    // Enrich history with updater names
    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        const updater = await get('users', entry.updated_by);
        return {
          ...entry,
          updated_by_name: updater?.name
        };
      })
    );

    res.json({
      ...order,
      garment_name: garment?.name,
      emoji: garment?.emoji,
      image_url: garment?.image_url,
      customization_options: garment?.customization_options,
      customer_name: customer?.name,
      customer_phone: customer?.phone,
      customer_email: customer?.email,
      tailor_name: tailor?.name,
      measurements: measurements || {},
      history: enrichedHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders
router.post('/', authenticate, authorize('customer', 'admin'), async (req, res) => {
  try {
    const { 
      garment_id, 
      fabric_id, 
      fabric_source, 
      color, 
      customization_notes, 
      due_date,
      customizations, // Selected options { "Type": "OptionName" }
      measurements,   // { "Chest": "38", ... }
      design_images,  // Array of URLs
      customer_id,    // Admin can specify customer
      tailor_id,      // Admin can specify tailor
      status          // Admin can specify status
    } = req.body;

    if (!garment_id) {
      return res.status(400).json({ error: 'garment_id is required' });
    }

    const garment = await get('garments', garment_id);
    if (!garment) {
      return res.status(404).json({ error: 'Garment not found' });
    }

    let totalPrice = garment.base_price || 0;
    let fabricName = 'Customer Provided';

    // 1. Fabric Price Calculation
    if (fabric_source === 'website' && fabric_id) {
      const fabric = await get('fabrics', fabric_id);
      if (fabric) {
        fabricName = fabric.name;
        // Assume roughly 2.5 meters per garment for simplicity, or add a field to garment later
        totalPrice += (fabric.price_per_meter * 2.5);
      }
    }

    // 2. Customization Price Calculation
    if (customizations && typeof customizations === 'object') {
      const allCustoms = await queryCollection('customizations', [['is_active', '==', true]]);
      
      Object.entries(customizations).forEach(([type, optionName]) => {
        const matching = allCustoms.find(c => 
          c.customization_type === type && 
          c.option_name === optionName &&
          (c.garment_type === garment.category || c.garment_type === 'all')
        );
        if (matching) {
          totalPrice += (matching.extra_price || 0);
        }
      });
    }

    const orderNumber = 'ST-' + Date.now().toString().slice(-6);
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14); // 2 weeks default

    const finalCustomerId = (req.user.role === 'admin' && customer_id) ? customer_id : req.user.id;

    const orderData = {
      order_number: orderNumber,
      customer_id: finalCustomerId,
      garment_id: garment_id,
      fabric_id: fabric_id || null,
      fabric_source: fabric_source || 'customer',
      fabric_name: fabricName,
      color: color || '',
      customization_notes: customization_notes || '',
      customizations: customizations || {},
      measurements: measurements || {},
      design_images: design_images || [],
      total_price: Math.round(totalPrice),
      status: (req.user.role === 'admin' && status) ? status : 'pending',
      tailor_id: (req.user.role === 'admin' && tailor_id) ? tailor_id : null,
      payment_status: 'unpaid',
      due_date: due_date ? new Date(due_date) : defaultDueDate,
      created_at: new Date(),
      updated_at: new Date()
    };

    const order = await add('orders', orderData);
    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, authorize('tailor', 'admin'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'assigned', 'cutting', 'stitching', 'finishing', 'ready', 'dispatched', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await get('orders', req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order
    await update('orders', req.params.id, {
      status: status,
      updated_at: new Date()
    });

    // Record in history
    await add('order_status_history', {
      order_id: req.params.id,
      status: status,
      notes: note || null,
      updated_by: req.user.id,
      created_at: new Date()
    });

    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/assign (admin only)
router.patch('/:id/assign', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { tailor_id } = req.body;

    const tailor = await get('users', tailor_id);
    if (!tailor || tailor.role !== 'tailor') {
      return res.status(404).json({ error: 'Tailor not found' });
    }

    await update('orders', req.params.id, {
      tailor_id: tailor_id,
      status: 'assigned',
      updated_at: new Date()
    });

    res.json({ message: 'Tailor assigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id/messages
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const messages = await queryCollection('messages', [['order_id', '==', req.params.id]], [['created_at', 'asc']]);

    // Enrich messages with sender names
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const sender = await get('users', msg.sender_id);
        return {
          ...msg,
          sender_name: sender?.name
        };
      })
    );

    res.json(enrichedMessages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/messages
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content required' });
    }

    const message = await add('messages', {
      order_id: req.params.id,
      sender_id: req.user.id,
      content: content,
      created_at: new Date()
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
