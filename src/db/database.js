const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let supabase;

// Initialize Supabase client
function initializeSupabase() {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized');
  return supabase;
}

// Get Supabase client
function getDB() {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initDB() first.');
  }
  return supabase;
}

// Helper: Map Firestore-style operator to Supabase filter method
function applyFilter(query, field, operator, value) {
  switch (operator) {
    case '==': return query.eq(field, value);
    case '!=': return query.neq(field, value);
    case '>': return query.gt(field, value);
    case '>=': return query.gte(field, value);
    case '<': return query.lt(field, value);
    case '<=': return query.lte(field, value);
    case 'in': return query.in(field, value);
    case 'array-contains': return query.contains(field, [value]);
    default: return query.eq(field, value);
  }
}

// Helper: Add row with auto-generated UUID
async function add(collection, data) {
  try {
    const { data: result, error } = await getDB()
      .from(collection)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  } catch (err) {
    console.error(`Error adding to ${collection}:`, err.message);
    throw err;
  }
}

// Helper: Set row with specific ID (upsert)
async function set(collection, id, data) {
  try {
    const { data: result, error } = await getDB()
      .from(collection)
      .upsert({ id, ...data })
      .select()
      .single();
    
    if (error) throw error;
    return result;
  } catch (err) {
    console.error(`Error setting ${collection}/${id}:`, err.message);
    throw err;
  }
}

// Helper: Update row
async function update(collection, id, data) {
  try {
    const { data: result, error } = await getDB()
      .from(collection)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  } catch (err) {
    console.error(`Error updating ${collection}/${id}:`, err.message);
    throw err;
  }
}

// Helper: Get single row by ID
async function get(collection, id) {
  try {
    const { data: result, error } = await getDB()
      .from(collection)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return result;
  } catch (err) {
    console.error(`Error getting ${collection}/${id}:`, err.message);
    throw err;
  }
}

// Helper: Query rows with filters, ordering, and limit
async function queryCollection(collection, whereCondition = null, orderBy = null, limit = null) {
  try {
    let query = getDB().from(collection).select('*');
    
    // Apply where conditions
    const whereClauses = [];
    if (whereCondition && Array.isArray(whereCondition) && whereCondition.length > 0) {
      if (Array.isArray(whereCondition[0])) {
        whereCondition.forEach((clause) => {
          if (Array.isArray(clause) && clause.length === 3) {
            whereClauses.push(clause);
          }
        });
      } else if (whereCondition.length === 3) {
        whereClauses.push(whereCondition);
      }
    }
    
    whereClauses.forEach(([field, operator, value]) => {
      query = applyFilter(query, field, operator, value);
    });
    
    // Apply ordering
    if (orderBy && Array.isArray(orderBy) && orderBy.length > 0) {
      if (Array.isArray(orderBy[0])) {
        orderBy.forEach((order) => {
          if (Array.isArray(order) && order.length > 0) {
            const [field, direction] = order;
            query = query.order(field, { ascending: (direction || 'asc') === 'asc' });
          }
        });
      } else {
        const [field, direction] = orderBy;
        query = query.order(field, { ascending: (direction || 'asc') === 'asc' });
      }
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data: results, error } = await query;
    
    if (error) throw error;
    return results || [];
  } catch (err) {
    console.error(`Error querying ${collection}:`, err.message);
    throw err;
  }
}

// Helper: Find first matching row
async function findOne(collection, whereCondition) {
  try {
    let query = getDB().from(collection).select('*');
    
    const whereClauses = [];
    if (whereCondition && Array.isArray(whereCondition) && whereCondition.length > 0) {
      if (Array.isArray(whereCondition[0])) {
        whereCondition.forEach((clause) => {
          if (Array.isArray(clause) && clause.length === 3) {
            whereClauses.push(clause);
          }
        });
      } else if (whereCondition.length === 3) {
        whereClauses.push(whereCondition);
      }
    }
    
    whereClauses.forEach(([field, operator, value]) => {
      query = applyFilter(query, field, operator, value);
    });
    
    const { data: results, error } = await query.limit(1).maybeSingle();
    
    if (error) throw error;
    return results || null;
  } catch (err) {
    console.error(`Error finding one in ${collection}:`, err.message);
    throw err;
  }
}

// Helper: Delete row
async function deleteDoc(collection, id) {
  try {
    const { error } = await getDB()
      .from(collection)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error(`Error deleting ${collection}/${id}:`, err.message);
    throw err;
  }
}

// Initialize database and seed data
async function initDB() {
  try {
    console.log('\n🔧 Initializing Supabase...');
    initializeSupabase();
    
    // Check if data already seeded
    const adminExists = await findOne('users', ['email', '==', 'admin@silkthread.in']);
    
    if (adminExists) {
      console.log('✅ Database already seeded. Skipping seed data.');
      return;
    }
    
    console.log('📝 Seeding initial data...');
    
    // Hash passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const tailorHash = await bcrypt.hash('tailor123', 10);
    const customerHash = await bcrypt.hash('pass123', 10);
    
    // Seed users
    const adminUser = await add('users', {
      name: 'Admin',
      email: 'admin@silkthread.in',
      phone: '',
      password_hash: adminHash,
      role: 'admin',
      avatar: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    const tailor1 = await add('users', {
      name: 'Ramesh',
      email: 'ramesh@silkthread.in',
      phone: '9876543210',
      password_hash: tailorHash,
      role: 'tailor',
      avatar: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    const tailor2 = await add('users', {
      name: 'Anitha',
      email: 'anitha@silkthread.in',
      phone: '9876543211',
      password_hash: tailorHash,
      role: 'tailor',
      avatar: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    const customer = await add('users', {
      name: 'Arjun',
      email: 'arjun@example.com',
      phone: '9876543212',
      password_hash: customerHash,
      role: 'customer',
      avatar: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Seed tailor profiles
    await add('tailor_profiles', {
      user_id: tailor1.id,
      specializations: 'Formal wear, Sherwanis, Suits',
      rating: 4.8,
      total_orders: 45,
      active_orders: 2,
      max_capacity: 5,
      created_at: new Date().toISOString(),
    });
    
    await add('tailor_profiles', {
      user_id: tailor2.id,
      specializations: 'Traditional wear, Sarees, Lehengas',
      rating: 4.9,
      total_orders: 52,
      active_orders: 1,
      max_capacity: 5,
      created_at: new Date().toISOString(),
    });
    
    // Seed garments
    const garments = [
      { name: 'Sherwani', category: 'formal', description: 'Elegant ceremonial outfit', base_price: 3500, emoji: '🪡', fabric_options: 'Silk, Cotton, Blend', customization_options: 'Collar, Buttons, Embroidery', is_active: true, created_at: new Date().toISOString() },
      { name: 'Kurta', category: 'traditional', description: 'Comfortable traditional wear', base_price: 999, emoji: '👔', fabric_options: 'Cotton, Linen, Silk', customization_options: 'Neckline, Sleeves, Patterns', is_active: true, created_at: new Date().toISOString() },
      { name: 'Suit', category: 'formal', description: 'Classic formal suit', base_price: 2500, emoji: '🎩', fabric_options: 'Wool, Cotton Blend', customization_options: 'Lapel, Pockets, Lining', is_active: true, created_at: new Date().toISOString() },
      { name: 'Saree Blouse', category: 'blouse', description: 'Custom saree blouse', base_price: 499, emoji: '👗', fabric_options: 'Silk, Cotton', customization_options: 'Neckline, Sleeves, Embroidery', is_active: true, created_at: new Date().toISOString() },
      { name: 'Lehenga', category: 'traditional', description: 'Festive ceremonial dress', base_price: 2000, emoji: '👯', fabric_options: 'Silk, Net, Georgette', customization_options: 'Waist, Length, Embroidery', is_active: true, created_at: new Date().toISOString() },
      { name: 'Dhoti', category: 'traditional', description: 'Traditional dhoti', base_price: 799, emoji: '👕', fabric_options: 'Cotton, Silk', customization_options: 'Length, Width, Border', is_active: true, created_at: new Date().toISOString() },
    ];
    
    for (const garment of garments) {
      await add('garments', garment);
    }
    
    // Seed fabrics
    const fabrics = [
      { name: 'Pure Cotton', type: 'Cotton', image_url: null, price_per_meter: 399, stock_quantity: 200, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { name: 'Premium Silk', type: 'Silk', image_url: null, price_per_meter: 899, stock_quantity: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { name: 'Linen Blend', type: 'Linen', image_url: null, price_per_meter: 599, stock_quantity: 150, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    
    for (const fabric of fabrics) {
      await add('fabrics', fabric);
    }
    
    // Seed customizations
    const customizations = [
      { garment_type: 'shirt', customization_type: 'collar', option_name: 'Mandarin', extra_price: 50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { garment_type: 'shirt', customization_type: 'sleeve', option_name: 'Full sleeve', extra_price: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { garment_type: 'shirt', customization_type: 'pocket', option_name: 'Double pocket', extra_price: 30, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { garment_type: 'suit', customization_type: 'lapel', option_name: 'Peak lapel', extra_price: 150, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { garment_type: 'suit', customization_type: 'lining', option_name: 'Silk lining', extra_price: 200, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    
    for (const option of customizations) {
      await add('customizations', option);
    }
    
    console.log('✅ Database seeded with initial data');
    console.log('   - 4 users (1 admin, 2 tailors, 1 customer)');
    console.log('   - 2 tailor profiles');
    console.log('   - 6 garments in catalog');
    console.log('   - 3 fabrics');
    console.log('   - 5 customization options');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  }
}

module.exports = { initDB, getDB, add, set, update, get, queryCollection, findOne, deleteDoc };
