import User from '../Model/User.js';
import bcrypt from 'bcryptjs';

export const findUserByEmail = async (email)=>{
    return await User.findOne({email});
}

export const findUserById = async(id)=>{
    return await User.findById(id)
};

export const createUser = async(userData)=>{
    const user = new User(userData);
    return await user.save()
} 

export const deleteUser = async(userId)=>{
    return await User.deleteOne({_id:userId})
}

export const comparePassword = async(plainPassword,hashedPassword)=>{
    console.log('🔍 Comparing passwords:', { 
        plainPasswordLength: plainPassword?.length,
        hashedPasswordLength: hashedPassword?.length,
        hashedPasswordPrefix: hashedPassword?.substring(0, 10) + '...'
    });
    const result = await bcrypt.compare(plainPassword,hashedPassword);
    console.log('🔍 Password comparison result:', result);
    return result;
}

export const updateUser = async (userId,updateData)=>{
    return await  User.findByIdAndUpdate(userId,updateData,{ new:true})
}

export const getAllUsers = async (page = 1, limit = 10, search = '', status = '') => {
    const skip = (page - 1) * limit;
    
    // Build query object
    let query = { role: 'user' };
    
    // Add search filter
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    
    // Add status filter
    if (status === 'active') {
        query.isBlocked = false;
    } else if (status === 'blocked') {
        query.isBlocked = true;
    }
    // If status is 'all' or empty, don't add isBlocked filter
    
    console.log('📋 User query:', JSON.stringify(query, null, 2));
    
    const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password');
    
    const total = await User.countDocuments(query);
    
    return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}

export const toggleBlockUser = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        return null;
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    return user;
}
export const getTotalUsers = async () => {
    return await User.countDocuments({ role: 'user' });
};

export const getActiveUsers = async () => {
    return await User.countDocuments({ role: 'user', isBlocked: false });
};

export const getBlockedUsers = async () => {
    return await User.countDocuments({ role: 'user', isBlocked: true });
};

export const getRecentUsers = async (limit = 5) => {
    return await User.find({ role: 'user' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('firstName lastName email createdAt isBlocked');
};