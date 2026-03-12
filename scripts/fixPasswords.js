import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../Model/User.js';
import dotenv from 'dotenv';

dotenv.config();

const fixPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/papyrus');
        console.log('Connected to MongoDB');

        const users = await User.find({ password: { $exists: true, $ne: null } });
        console.log(`Found ${users.length} users with passwords`);

        for (const user of users) {
            if (!user.password.startsWith('$2')) {
                console.log(`Fixing password for user: ${user.email}`);
                const hashedPassword = await bcrypt.hash(user.password, 12);
                await User.findByIdAndUpdate(user._id, { password: hashedPassword });
                console.log(`✅ Fixed password for: ${user.email}`);
            } else {
                console.log(`✅ Password already hashed for: ${user.email}`);
            }
        }

        console.log('Password fix completed');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing passwords:', error);
        process.exit(1);
    }
};

fixPasswords();