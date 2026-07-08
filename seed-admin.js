import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/shared/models/User.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        // Connect to the database using the MONGODB_URI from .env
        const dbUri = process.env.MONGODB_URI;
        if (!dbUri) {
            console.error("Error: MONGODB_URI is not defined in your .env file");
            process.exit(1);
        }

        console.log('Connecting to database...');
        await mongoose.connect(dbUri);
        console.log('Successfully connected to the database.');

        const adminEmail = 'admin@papyrus.com';
        const plainPassword = 'admin123';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (existingAdmin) {
            console.log(`Admin with email ${adminEmail} already exists. Updating password...`);
            // Update the password just in case
            const hashedPassword = await bcrypt.hash(plainPassword, 12);
            existingAdmin.password = hashedPassword;
            await existingAdmin.save();
            console.log(`Password for ${adminEmail} has been updated to: ${plainPassword}`);
        } else {
            console.log(`Admin with email ${adminEmail} not found. Creating new admin user...`);
            // Create a new admin user
            const hashedPassword = await bcrypt.hash(plainPassword, 12);
            
            const newAdmin = new User({
                firstName: 'Admin',
                lastName: 'User',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });

            await newAdmin.save();
            console.log(`New admin user created successfully!`);
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: ${plainPassword}`);
        }

        console.log('Seed process completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error during admin seeding:', error);
        process.exit(1);
    }
};

seedAdmin();
