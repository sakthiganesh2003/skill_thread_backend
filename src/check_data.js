const { initDB, queryCollection } = require('./db/database');

async function check() {
  try {
    await initDB();
    const garments = await queryCollection('garments');
    console.log('\n--- GARMENTS ---');
    garments.forEach(g => {
      console.log(`[${g.id}] Name: ${g.name}, Image: ${g.image_url ? 'YES: ' + g.image_url.substring(0, 30) + '...' : 'NO'}`);
    });

    const fabrics = await queryCollection('fabrics');
    console.log('\n--- FABRICS ---');
    fabrics.forEach(f => {
      console.log(`[${f.id}] Name: ${f.name}, Image: ${f.image_url ? 'YES' : 'NO'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
