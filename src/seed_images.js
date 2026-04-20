const { initDB, queryCollection, update } = require('./db/database');

async function seedProfessionalImages() {
  try {
    await initDB();
    const garments = await queryCollection('garments');
    
    const placeholders = {
      'Kurta': 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&q=80&w=800',
      'Sherwani': 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&q=80&w=800',
      'Suit': 'https://images.unsplash.com/photo-1594932224010-75b4367c4c5c?auto=format&fit=crop&q=80&w=800',
      'Saree Blouse': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800',
      'Lehenga': 'https://images.unsplash.com/photo-1599948633230-aa0c8353edaa?auto=format&fit=crop&q=80&w=800',
      'Dhoti': 'https://images.unsplash.com/photo-1624313511393-6997b19b77da?auto=format&fit=crop&q=80&w=800'
    };

    console.log('--- Updating Database with Professional Images ---');
    
    for (const g of garments) {
      const imageUrl = placeholders[g.name];
      if (imageUrl) {
        await update('garments', g.id, { image_url: imageUrl });
        console.log(`✅ Updated ${g.name} with new image.`);
      }
    }

    console.log('\n✨ Database updated! Please refresh your home page.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedProfessionalImages();
