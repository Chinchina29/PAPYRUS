import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../Model/User.js';
import 'dotenv/config';

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('👤 Admin user already exists:', existingAdmin.email);
            console.log('🔑 If you need to use the default admin, please use:');
            console.log('📧 Email:', existingAdmin.email);
            console.log('🔑 Password: Check your database or reset if needed');
            console.log('🎯 Login at: http://localhost:3000/admin/signin');
            
            const shouldCreateNew = process.argv.includes('--force');
            if (!shouldCreateNew) {
                console.log('💡 Use --force flag to create admin@papyrus.com anyway');
                process.exit(0);
            }
        }

        const targetEmail = 'admin@papyrus.com';
        const existingTargetAdmin = await User.findOne({ email: targetEmail });
        
        if (existingTargetAdmin) {
            console.log('✅ Admin user admin@papyrus.com already exists!');
            console.log('📧 Email: admin@papyrus.com');
            console.log('🔑 Password: Admin123');
            console.log('🎯 Login at: http://localhost:3000/admin/signin');
            process.exit(0);
        }

        const adminData = {
            firstName: 'Admin',
            lastName: 'User',
            email: targetEmail,
            password: 'Admin123',
            role: 'admin',
            isVerified: true,
            isBlocked: false
        };

        const admin = new User(adminData);
        await admin.save();

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@papyrus.com');
        console.log('🔑 Password: Admin123');
        console.log('🎯 Login at: http://localhost:3000/admin/signin');

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createAdmin();