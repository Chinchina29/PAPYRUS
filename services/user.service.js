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
    return await bcrypt.compare(plainPassword,hashedPassword)
}

export const updateUser = async (userId,updateData)=>{
    return await  User.findByIdAndUpdate(userId,updateData,{ new:true})
}

export const getAllUsers = async (page = 1, limit = 10, search = '') => {
    const skip = (page - 1) * limit;
    const query = search 
        ? { 
            role: 'user',
            $or: [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        }
        : { role: 'user' };
    
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