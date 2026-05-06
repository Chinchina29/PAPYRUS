import User from '../models/User.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';

export const migrateUserGenres = async () => {
  try {
    console.log('Starting genre migration...');
    
    const users = await User.find({ 
      favoriteGenres: { $exists: true, $ne: [] } 
    });

    console.log(`Found ${users.length} users with favorite genres`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (!user.favoriteGenres || user.favoriteGenres.length === 0) {
        continue;
      }

      const firstGenre = user.favoriteGenres[0];
      
      if (typeof firstGenre === 'string' && !mongoose.Types.ObjectId.isValid(firstGenre)) {
        console.log(`User ${user.email} already has genre names, skipping...`);
        skippedCount++;
        continue;
      }

      const genreIds = user.favoriteGenres.filter(id => 
        mongoose.Types.ObjectId.isValid(id)
      );

      if (genreIds.length === 0) {
        skippedCount++;
        continue;
      }

      const categories = await Category.find({ 
        _id: { $in: genreIds } 
      }).select('name');

      const genreNames = categories.map(cat => cat.name);

      if (genreNames.length > 0) {
        user.favoriteGenres = genreNames;
        await user.save();
        console.log(`Migrated user ${user.email}: ${genreNames.join(', ')}`);
        migratedCount++;
      }
    }

    console.log(`Migration complete! Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
    return { success: true, migrated: migratedCount, skipped: skippedCount };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
};
