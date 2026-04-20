const router = require('express').Router();
const { add, set, update, get, queryCollection, findOne, deleteDoc } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/analytics/dashboard (admin only)
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Get total orders count
    const allOrders = await queryCollection('orders', []);
    const totalOrders = allOrders.length;

    // Get total revenue from delivered orders
    const deliveredOrders = await queryCollection('orders', [['status', '==', 'delivered']]);
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);

    // Get active orders count
    const activeStatuses = ['cutting', 'stitching', 'finishing', 'ready'];
    const activeOrders = allOrders.filter(order => activeStatuses.includes(order.status)).length;

    // Get high-rated tailors count
    const tailorProfiles = await queryCollection('tailor_profiles', [['rating', '>=', 4.5]]);
    const highRatedTailors = tailorProfiles.length;

    res.json({
      totalOrders,
      totalRevenue,
      activeOrders,
      highRatedTailors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
