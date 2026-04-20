const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function checkGarments() {
  try {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const resolvedPath = path.resolve(__dirname, '..', keyPath);
    console.log('Using key:', resolvedPath);
    const serviceAccount = require(resolvedPath);
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const db = admin.firestore();
    const snapshot = await db.collection('garments').get();
    
    console.log('--- Garments in DB ---');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${data.name}`);
      console.log(`Image URL: ${data.image_url || 'MISSING'}`);
      console.log(`Emoji: ${data.emoji || 'MISSING'}`);
      console.log('----------------------');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkGarments();
