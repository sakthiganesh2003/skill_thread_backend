const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let db;

// Initialize Firebase Admin SDK
async function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin SDK already initialized');
      db = admin.firestore();
      return db;
    }

    // Try to load from service account key file first
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (keyPath) {
      // Resolve path relative to backend root (2 levels up from src/db/)
      const resolvedPath = path.resolve(__dirname, '../../', keyPath);

      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Firebase key not found at: ${resolvedPath}`);
      }

      const serviceAccount = require(resolvedPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase initialized with service account file');
    } else {
      // Fallback to environment variables
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI,
        tokenUri: process.env.FIREBASE_TOKEN_URI,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase initialized with environment variables');
    }

    db = admin.firestore();
    return db;
  } catch (err) {
    console.error('❌ Firebase initialization error:', err.message);
    throw err;
  }
}

// Get Firestore instance
function getDB() {
  if (!db) {
    throw new Error('Firebase not initialized. Call initDB() first.');
  }
  return db;
}

// Helper: Add document with auto-ID
async function add(collection, data) {
  try {
    const docRef = await getDB().collection(collection).add(data);
    return { id: docRef.id, ...data };
  } catch (err) {
    console.error(`Error adding to ${collection}:`, err);
    throw err;
  }
}

// Helper: Set document with specific ID
async function set(collection, id, data) {
  try {
    await getDB().collection(collection).doc(id).set(data, { merge: false });
    return { id, ...data };
  } catch (err) {
    console.error(`Error setting ${collection}/${id}:`, err);
    throw err;
  }
}

// Helper: Update document
async function update(collection, id, data) {
  try {
    await getDB().collection(collection).doc(id).update(data);
    return { id, ...data };
  } catch (err) {
    console.error(`Error updating ${collection}/${id}:`, err);
    throw err;
  }
}

// Helper: Get single document
async function get(collection, id) {
  try {
    const doc = await getDB().collection(collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    console.error(`Error getting ${collection}/${id}:`, err);
    throw err;
  }
}

// Helper: Query documents
async function queryCollection(collection, whereCondition = null, orderBy = null, limit = null) {
  try {
    let q = getDB().collection(collection);

    // Normalize whereCondition to an array of [field, operator, value] tuples.
    // Accepts either a single tuple or an array of tuples.
    const whereClauses = [];
    if (whereCondition && Array.isArray(whereCondition) && whereCondition.length > 0) {
      if (Array.isArray(whereCondition[0])) {
        // Multiple conditions: [[field, op, value], ...]
        whereCondition.forEach((clause) => {
          if (Array.isArray(clause) && clause.length === 3) {
            whereClauses.push(clause);
          }
        });
      } else if (whereCondition.length === 3) {
        // Single condition: [field, op, value]
        whereClauses.push(whereCondition);
      }
    }

    whereClauses.forEach(([field, operator, value]) => {
      q = q.where(field, operator, value);
    });

    // Normalize orderBy to an array of [field, direction] tuples.
    if (orderBy && Array.isArray(orderBy) && orderBy.length > 0) {
      if (Array.isArray(orderBy[0])) {
        orderBy.forEach((order) => {
          if (Array.isArray(order) && order.length > 0) {
            const [field, direction] = order;
            q = q.orderBy(field, direction || 'asc');
          }
        });
      } else {
        const [field, direction] = orderBy;
        q = q.orderBy(field, direction || 'asc');
      }
    }

    if (limit) {
      q = q.limit(limit);
    }

    const snapshot = await q.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(`Error querying ${collection}:`, err);
    throw err;
  }
}

// Helper: Find first matching document
async function findOne(collection, whereCondition) {
  try {
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

    let q = getDB().collection(collection);
    whereClauses.forEach(([field, operator, value]) => {
      q = q.where(field, operator, value);
    });

    const snapshot = await q.limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    console.error(`Error finding one in ${collection}:`, err);
    throw err;
  }
}

// Helper: Delete document
async function deleteDoc(collection, id) {
  try {
    await getDB().collection(collection).doc(id).delete();
    return { success: true };
  } catch (err) {
    console.error(`Error deleting ${collection}/${id}:`, err);
    throw err;
  }
}

// Initialize database and seed data
async function initDB() {
  try {
    console.log('\n🔥 Initializing Firebase Firestore...');
    await initializeFirebase();

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
    const adminId = (
      await add('users', {
        name: 'Admin',
        email: 'admin@silkthread.in',
        phone: '',
        password_hash: adminHash,
        role: 'admin',
        avatar: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ).id;

    const tailor1Id = (
      await add('users', {
        name: 'Ramesh',
        email: 'ramesh@silkthread.in',
        phone: '9876543210',
        password_hash: tailorHash,
        role: 'tailor',
        avatar: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ).id;

    const tailor2Id = (
      await add('users', {
        name: 'Anitha',
        email: 'anitha@silkthread.in',
        phone: '9876543211',
        password_hash: tailorHash,
        role: 'tailor',
        avatar: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ).id;

    const customerId = (
      await add('users', {
        name: 'Arjun',
        email: 'arjun@example.com',
        phone: '9876543212',
        password_hash: customerHash,
        role: 'customer',
        avatar: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ).id;

    // Seed tailor profiles
    await add('tailor_profiles', {
      user_id: tailor1Id,
      specializations: 'Formal wear, Sherwanis, Suits',
      rating: 4.8,
      total_orders: 45,
      active_orders: 2,
      max_capacity: 5,
      created_at: new Date().toISOString(),
    });

    await add('tailor_profiles', {
      user_id: tailor2Id,
      specializations: 'Traditional wear, Sarees, Lehengas',
      rating: 4.9,
      total_orders: 52,
      active_orders: 1,
      max_capacity: 5,
      created_at: new Date().toISOString(),
    });

    // Seed garments
    const garments = [
      {
        name: 'Sherwani',
        category: 'formal',
        description: 'Elegant ceremonial outfit',
        base_price: 3500,
        emoji: '🪡',
        fabric_options: 'Silk, Cotton, Blend',
        customization_options: 'Collar, Buttons, Embroidery',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        name: 'Kurta',
        category: 'traditional',
        description: 'Comfortable traditional wear',
        base_price: 999,
        emoji: '👔',
        fabric_options: 'Cotton, Linen, Silk',
        customization_options: 'Neckline, Sleeves, Patterns',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        name: 'Suit',
        category: 'formal',
        description: 'Classic formal suit',
        base_price: 2500,
        emoji: '🎩',
        fabric_options: 'Wool, Cotton Blend',
        customization_options: 'Lapel, Pockets, Lining',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        name: 'Saree Blouse',
        category: 'blouse',
        description: 'Custom saree blouse',
        base_price: 499,
        emoji: '👗',
        fabric_options: 'Silk, Cotton',
        customization_options: 'Neckline, Sleeves, Embroidery',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        name: 'Lehenga',
        category: 'traditional',
        description: 'Festive ceremonial dress',
        base_price: 2000,
        emoji: '👯',
        fabric_options: 'Silk, Net, Georgette',
        customization_options: 'Waist, Length, Embroidery',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        name: 'Dhoti',
        category: 'traditional',
        description: 'Traditional dhoti',
        base_price: 799,
        emoji: '👕',
        fabric_options: 'Cotton, Silk',
        customization_options: 'Length, Width, Border',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    for (const garment of garments) {
      await add('garments', garment);
    }

    // Seed fabrics
    const fabrics = [
      {
        name: 'Pure Cotton',
        type: 'Cotton',
        image_url: null,
        price_per_meter: 399,
        stock_quantity: 200,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        name: 'Premium Silk',
        type: 'Silk',
        image_url: null,
        price_per_meter: 899,
        stock_quantity: 100,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        name: 'Linen Blend',
        type: 'Linen',
        image_url: null,
        price_per_meter: 599,
        stock_quantity: 150,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const fabric of fabrics) {
      await add('fabrics', fabric);
    }

    // Seed customization options
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
