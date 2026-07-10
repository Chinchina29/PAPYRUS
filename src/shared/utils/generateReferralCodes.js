import User from '../models/User.js';
import * as referralService from '../services/referral.service.js';

/**
 * Generate referral codes for existing users who don't have one
 * This is a one-time migration utility
 */
export const generateReferralCodesForExistingUsers = async () => {
  try {
    console.log('Starting referral code generation for existing users...');

    // Count total users in DB for diagnostics
    const totalUsersInDB = await User.countDocuments({ role: 'user' });
    console.log(`Total user accounts in database: ${totalUsersInDB}`);

    // Use lean() so Mongoose doesn't virtualize missing fields —
    // this ensures { $exists: false } correctly catches documents
    // that predate the referralCode field being added to the schema.
    const usersWithoutCode = await User.find({
      role: 'user',
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: '' },
      ],
    }).lean();

    console.log(`Found ${usersWithoutCode.length} users without referral codes`);

    let successCount = 0;
    let failCount = 0;

    for (const leanUser of usersWithoutCode) {
      try {
        const referralCode = await referralService.generateReferralCode();
        // Re-fetch as a full Mongoose document so .save() works
        await User.findByIdAndUpdate(leanUser._id, { referralCode });
        successCount++;
        console.log(`✓ Generated code ${referralCode} for user: ${leanUser.email}`);
      } catch (error) {
        failCount++;
        console.error(`✗ Failed to generate code for user ${leanUser.email}:`, error.message);
      }
    }

    const result = {
      success: true,
      totalUsersInDB,
      usersWithoutCode: usersWithoutCode.length,
      generated: successCount,
      failed: failCount,
      message:
        usersWithoutCode.length === 0
          ? `All ${totalUsersInDB} users already have referral codes — nothing to do.`
          : `Successfully generated ${successCount} referral codes out of ${usersWithoutCode.length} users`,
    };

    console.log('\n=== Migration Complete ===');
    console.log(`Total users in DB  : ${result.totalUsersInDB}`);
    console.log(`Users without code : ${result.usersWithoutCode}`);
    console.log(`Successfully generated: ${result.generated}`);
    console.log(`Failed: ${result.failed}`);

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message,
      message: `Migration failed: ${error.message}`,
    };
  }
};

// Allow running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // This is being run directly
  const mongoose = await import('mongoose');
  const dotenv = await import('dotenv');
  
  dotenv.config();
  
  try {
    await mongoose.default.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const result = await generateReferralCodesForExistingUsers();
    console.log('\nFinal Result:', result);
    
    await mongoose.default.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}
