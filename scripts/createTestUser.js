import mongoose from 'mongoose';
import User from '../Model/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/papyrus');
        console.log('Connected to MongoDB');

        // Delete existing test user
        await User.deleteOne({ email: 'test@example.com' });
        
        // Create new test user
        const testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'password123',
            isVerified: true,
            role: 'user'
        });

        await testUser.save();
        console.log('✅ Test user created successfully');
        console.log('📧 Email: test@example.com');
        console.log('🔑 Password: password123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating test user:', error);
        process.exit(1);
    }
};

createTestUser();